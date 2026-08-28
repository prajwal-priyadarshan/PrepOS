import { useVault } from '@/store/useVault';
import type { TreeNode } from '@/vault';

interface Props {
  nodes: TreeNode[];
  depth?: number;
  onOpenFile?: (path: string) => void;
  selectedPath?: string | null;
}

export function FileTree({ nodes, depth = 0, onOpenFile, selectedPath }: Props) {
  const expanded = useVault((s) => s.expanded);
  const toggleExpanded = useVault((s) => s.toggleExpanded);

  if (nodes.length === 0 && depth === 0) {
    return <p className="px-3 py-2 text-sm text-graphite">This folder is empty.</p>;
  }

  return (
    <ul className={depth === 0 ? 'space-y-px' : 'space-y-px border-l border-graphite/15 ml-3'}>
      {nodes.map((node) => {
        const isOpen = expanded.has(node.path);
        const isSelected = selectedPath === node.path;

        return (
          <li key={node.path}>
            <button
              type="button"
              onClick={() =>
                node.isDirectory ? toggleExpanded(node.path) : onOpenFile?.(node.path)
              }
              aria-expanded={node.isDirectory ? isOpen : undefined}
              className={[
                'flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm transition-colors',
                isSelected ? 'bg-ink text-paper' : 'hover:bg-graphite/10',
              ].join(' ')}
              style={{ paddingLeft: `${depth * 10 + 8}px` }}
            >
              <span
                aria-hidden
                className={[
                  'inline-block w-3 shrink-0 text-center text-[10px]',
                  isSelected ? 'text-paper/70' : 'text-graphite',
                ].join(' ')}
              >
                {node.isDirectory ? (isOpen ? '\u25BE' : '\u25B8') : ''}
              </span>
              <span className={node.isDirectory ? 'font-medium' : ''}>{node.name}</span>
            </button>

            {node.isDirectory && isOpen && node.children && node.children.length > 0 && (
              <FileTree
                nodes={node.children}
                depth={depth + 1}
                {...(onOpenFile ? { onOpenFile } : {})}
                selectedPath={selectedPath ?? null}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
