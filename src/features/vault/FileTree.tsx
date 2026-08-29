import { useVault } from '@/store/useVault';
import type { TreeNode } from '@/vault';

interface Props {
  nodes: TreeNode[];
  depth?: number;
  onOpenFile?: (path: string) => void;
  selectedPath?: string | null;
}

/**
 * The vault, as a list rather than a panel.
 *
 * Rows carry a negative left margin equal to their own padding, so the text
 * sits optically flush with the kicker above it while the hover and selected
 * tints still extend past it - the fill reads as a highlight over the column
 * rather than as a box the list lives inside.
 */
export function FileTree({ nodes, depth = 0, onOpenFile, selectedPath }: Props) {
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
          <li key={node.path}>
            <button
              type="button"
              onClick={() =>
                node.isDirectory ? toggleExpanded(node.path) : onOpenFile?.(node.path)
              }
              aria-expanded={node.isDirectory ? isOpen : undefined}
              title={node.name}
              className={[
                'flex w-full items-center gap-1.5 rounded-sm px-[9px] py-[7px] text-left text-[13.5px] leading-tight transition-colors',
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
