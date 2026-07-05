import { useMemo, useState } from "react";
import type { Theme } from "../types";

interface Props {
  themes: Theme[]; // 利用可能なテーマ
  groups: string[]; // 表示順のグループ（テーマが存在するもののみ）
  selectedId: string;
  onSelect: (id: string) => void;
}

export function ThemeSelector({ themes, groups, selectedId, onSelect }: Props) {
  const [activeGroup, setActiveGroup] = useState(groups[0] ?? "");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q)
      return themes.filter(
        (t) =>
          t.label.toLowerCase().includes(q) ||
          (t.nameEn ?? "").toLowerCase().includes(q) ||
          (t.indicator ?? "").toLowerCase().includes(q),
      );
    return themes.filter((t) => t.group === activeGroup);
  }, [themes, activeGroup, query]);

  // カタログ導入でテーマが1万件になるため、描画は上限を設けて検索で絞ってもらう
  const MAX_SHOWN = 200;
  const shown = visible.length > MAX_SHOWN ? visible.slice(0, MAX_SHOWN) : visible;

  return (
    <div className="selector">
      <div className="selector-row selector-search">
        <input
          className="search"
          type="search"
          placeholder="テーマを検索（例: GDP, 寿命, CO₂, forest, trade …）"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {!query && (
        <div className="selector-row groups" role="tablist">
          {groups.map((g) => (
            <button
              key={g}
              className={"group-tab" + (g === activeGroup ? " active" : "")}
              onClick={() => setActiveGroup(g)}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      <div className="selector-row themes">
        {shown.map((t) => (
          <button
            key={t.id}
            className={"theme-chip" + (t.id === selectedId ? " active" : "")}
            onClick={() => onSelect(t.id)}
            title={t.description ?? t.indicator ?? t.label}
          >
            {t.label}
          </button>
        ))}
        {visible.length > shown.length && (
          <span className="empty">
            …ほか {(visible.length - shown.length).toLocaleString()} 件（検索で絞り込めます）
          </span>
        )}
        {visible.length === 0 && <span className="empty">該当するテーマがありません</span>}
      </div>
    </div>
  );
}
