import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useVault } from '@/store/useVault';
import type { TreeNode } from '@/vault';

interface Props {
  nodes: TreeNode[];
  depth?: number;
  onOpenFile?: (path: string) => void;
  selectedPath?: string | null;
  /**
   * Fires after a file or folder is actually deleted, with the path that's
   * now gone. The tree itself doesn't know what a workspace has open -
   * App.tsx uses this to close a reader or clear a selection that pointed
   * inside what just disappeared.
   */
  onNodeRemoved?: (path: string) => void;
}

/**
 * The vault, as a list rather than a panel.
 *
 * Rows carry a negative left margin equal to their own padding, so the text
 * sits optically flush with the kicker above it while the hover and selected
 * tints still extend past it - the fill reads as a highlight over the column
 * rather than as a box the list lives inside.
 */
export function FileTree({ nodes, depth = 0, onOpenFile, selectedPath, onNodeRemoved }: Props) {
  const expanded = useVault((s) => s.expanded);
  const toggleExpanded = useVault((s) => s.toggleExpanded);

  if (nodes.length === 0 && depth === 0) {
    return <p className="text-[12.5px] text-muted">This folder is empty.</p>;
  }

  return (
    <ul className={depth === 0 ? '-ml-[9px]' : 'ml-2.5'}>
      {nodes.map((node) => {
        const isOpen = expanded.has(node.path);
        const isSelected = selectedPath === node.path;

        return (
          <FileTreeRow
            key={node.path}
            node={node}
            isOpen={isOpen}
            isSelected={isSelected}
            onToggle={() => toggleExpanded(node.path)}
            {...(onOpenFile ? { onOpenFile } : {})}
            {...(onNodeRemoved ? { onNodeRemoved } : {})}
          >
            {node.isDirectory && isOpen && node.children && node.children.length > 0 && (
              <FileTree
                nodes={node.children}
                depth={depth + 1}
                {...(onOpenFile ? { onOpenFile } : {})}
                selectedPath={selectedPath ?? null}
                {...(onNodeRemoved ? { onNodeRemoved } : {})}
              />
            )}
          </FileTreeRow>
        );
      })}
    </ul>
  );
}

interface RowProps {
  node: TreeNode;
  isOpen: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onOpenFile?: (path: string) => void;
  onNodeRemoved?: (path: string) => void;
  children?: ReactNode;
}

type RowMode = 'view' | 'renaming' | 'confirmingDelete';

/**
 * One row, plus the rename and delete affordances that only appear on hover -
 * a study vault's tree is mostly read, not edited, so the controls stay out
 * of the way until asked for rather than sitting there permanently.
 */
function FileTreeRow({
  node,
  isOpen,
  isSelected,
  onToggle,
  onOpenFile,
  onNodeRemoved,
  children,
}: RowProps) {
  const renameNode = useVault((s) => s.renameNode);
  const deleteNode = useVault((s) => s.deleteNode);

  const [mode, setMode] = useState<RowMode>('view');
  const [name, setName] = useState(node.name);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (mode === 'renaming') inputRef.current?.focus();
  }, [mode]);

  const startRename = () => {
    setName(node.name);
    setMode('renaming');
  };

  const submitRename = async () => {
    if (name.trim().length === 0 || name.trim() === node.name) {
      setMode('view');
      return;
    }
    setBusy(true);
    const ok = await renameNode(node.path, name.trim());
    setBusy(false);
    if (ok) setMode('view');
  };

  const confirmDelete = async () => {
    setBusy(true);
    const ok = await deleteNode(node.path);
    setBusy(false);
    if (ok) onNodeRemoved?.(node.path);
  };

  if (mode === 'renaming') {
    return (
      <li>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitRename();
          }}
          className="flex items-center gap-1.5 px-[9px] py-[5px]"
        >
          <input
            ref={inputRef}
            value={name}
            disabled={busy}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setMode('view');
            }}
            onBlur={() => {
              if (!busy) setMode('view');
            }}
            aria-label={`Rename ${node.name}`}
            className="tabular w-full min-w-0 rounded-sm border border-divider bg-surface px-2 py-1 text-[13px]"
          />
        </form>
      </li>
    );
  }

  return (
    <li>
      <div className="group/row flex items-center gap-1">
        <button
          type="button"
          onClick={() => (node.isDirectory ? onToggle() : onOpenFile?.(node.path))}
          aria-expanded={node.isDirectory ? isOpen : undefined}
          title={node.name}
          className={[
            'flex min-w-0 flex-1 items-center gap-1.5 rounded-sm px-[9px] py-[7px] text-left text-[13.5px] leading-tight transition-colors',
            isSelected ? 'bg-tint text-accent' : 'hover:bg-tint',
          ].join(' ')}
        >
          <span
            aria-hidden
            className={[
              'inline-block w-2 shrink-0 text-center text-[9px]',
              isSelected ? 'text-accent' : 'text-muted',
            ].join(' ')}
          >
            {node.isDirectory ? (isOpen ? '▾' : '▸') : ''}
          </span>
          <span className={['truncate', node.isDirectory ? 'font-semibold' : ''].join(' ')}>
            {node.name}
          </span>
        </button>

        {mode === 'confirmingDelete' ? (
          <span className="flex shrink-0 items-center gap-2 pr-1 text-[11.5px]">
            <button
              type="button"
              onClick={confirmDelete}
              disabled={busy}
              className="text-flag transition-opacity hover:opacity-70 disabled:opacity-40"
            >
              {busy ? 'Deleting…' : 'Delete'}
            </button>
            <button
              type="button"
              onClick={() => setMode('view')}
              disabled={busy}
              className="text-muted transition-colors hover:text-accent"
            >
              Cancel
            </button>
          </span>
        ) : (
          <span className="hidden shrink-0 items-center gap-0.5 pr-1 group-hover/row:flex">
            <button
              type="button"
              onClick={startRename}
              title={`Rename ${node.name}`}
              aria-label={`Rename ${node.name}`}
              className="rounded-sm px-1.5 py-1 text-[11.5px] text-muted transition-colors hover:text-accent"
            >
              Rename
            </button>
            <button
              type="button"
              onClick={() => setMode('confirmingDelete')}
              title={`Delete ${node.name}`}
              aria-label={`Delete ${node.name}`}
              className="rounded-sm px-1.5 py-1 text-[11.5px] text-muted transition-colors hover:text-flag"
            >
              Delete
            </button>
          </span>
        )}
      </div>

      {children}
    </li>
  );
}
