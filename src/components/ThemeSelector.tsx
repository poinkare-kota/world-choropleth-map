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
    const q = query.trim();
    if (q) return themes.filter((t) => t.label.includes(q) || (t.indicator ?? "").includes(q));
    return themes.filter((t) => t.group === activeGroup);
  }, [themes, activeGroup, query]);

  return (
    <div className="selector">
      <div className="selector-row selector-search">
        <input
          className="search"
          type="search"
          placeholder="テーマを検索（例: GDP, 寿命, CO₂ …）"
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
        {visible.map((t) => (
          <button
            key={t.id}
            className={"theme-chip" + (t.id === selectedId ? " active" : "")}
            onClick={() => onSelect(t.id)}
            title={t.description ?? t.indicator ?? t.label}
          >
            {t.label}
          </button>
        ))}
        {visible.length === 0 && <span className="empty">該当するテーマがありません</span>}
      </div>
    </div>
  );
}
