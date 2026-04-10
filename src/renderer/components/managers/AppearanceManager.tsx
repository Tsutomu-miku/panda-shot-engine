// ============================================================
// panda-shot-engine — Appearance Manager Component
// Manages character outfits, hair, accessories, etc.
// ============================================================

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useEditor } from '../../hooks/useEditorState';
import type { AppearanceItem, AppearancePreset, AppearanceCategoryType } from '../../../core/project/types';
import { APPEARANCE_CATEGORIES } from '../../../core/project/types';
import './AppearanceManager.css';

// ─── Category Labels & Icons ────────────────────────────────

const CATEGORY_LABELS: Record<AppearanceCategoryType, string> = {
  hair: '发型 Hair',
  outfit: '服装 Outfit',
  accessory: '饰品 Accessory',
  hat: '帽子 Hat',
  shoes: '鞋子 Shoes',
  weapon: '武器 Weapon',
  custom: '自定义 Custom',
};

const CATEGORY_ICONS: Record<AppearanceCategoryType, string> = {
  hair: '💇',
  outfit: '👔',
  accessory: '💍',
  hat: '🎩',
  shoes: '👟',
  weapon: '⚔️',
  custom: '✨',
};

// ─── Helper: generate unique id ─────────────────────────────

let _idCounter = 0;
function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${(++_idCounter).toString(36)}`;
}

// ─── Image Upload Button ────────────────────────────────────

const ImageUploadSlot: React.FC<{
  label: string;
  currentImage?: string;
  onUpload: (dataUrl: string) => void;
  size?: number;
}> = ({ label, currentImage, onUpload, size = 80 }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onUpload(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [onUpload]);

  return (
    <div className="appearance-upload-slot" style={{ width: size, height: size }}
      onClick={() => inputRef.current?.click()}>
      {currentImage ? (
        <img src={currentImage} alt={label} className="appearance-upload-slot__img" />
      ) : (
        <div className="appearance-upload-slot__empty">
          <span className="appearance-upload-slot__plus">+</span>
          <span className="appearance-upload-slot__label">{label}</span>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={handleFile} />
    </div>
  );
};

// ─── Appearance Item Card ───────────────────────────────────

const AppearanceItemCard: React.FC<{
  item: AppearanceItem;
  isEquipped: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ item, isEquipped, onToggle, onEdit, onDelete }) => {
  return (
    <div className={`appearance-item-card ${isEquipped ? 'equipped' : ''}`}>
      <div className="appearance-item-card__preview">
        {item.image ? (
          <img src={item.image} alt={item.name} />
        ) : (
          <span className="appearance-item-card__icon">
            {CATEGORY_ICONS[item.category] || '📦'}
          </span>
        )}
      </div>
      <div className="appearance-item-card__info">
        <div className="appearance-item-card__name">{item.name}</div>
        <div className="appearance-item-card__cat">
          {CATEGORY_ICONS[item.category]} {CATEGORY_LABELS[item.category]}
        </div>
        <div className="appearance-item-card__z">z: {item.zIndex}</div>
      </div>
      <div className="appearance-item-card__actions">
        <button className={`btn btn--xs ${isEquipped ? 'btn--success' : ''}`}
          onClick={onToggle} title={isEquipped ? 'Unequip' : 'Equip'}>
          {isEquipped ? '✓' : '○'}
        </button>
        <button className="btn btn--xs" onClick={onEdit} title="Edit">✎</button>
        <button className="btn btn--xs btn--danger" onClick={onDelete} title="Delete">×</button>
      </div>
    </div>
  );
};

// ─── Preset Card ────────────────────────────────────────────

const PresetCard: React.FC<{
  preset: AppearancePreset;
  isActive: boolean;
  itemCount: number;
  onActivate: () => void;
  onDelete: () => void;
}> = ({ preset, isActive, itemCount, onActivate, onDelete }) => {
  return (
    <div className={`preset-card ${isActive ? 'active' : ''}`} onClick={onActivate}>
      <div className="preset-card__name">{preset.name}</div>
      <div className="preset-card__count">{itemCount} items</div>
      {isActive && <div className="preset-card__badge">Active</div>}
      <button className="preset-card__delete btn btn--xs btn--danger"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}>×</button>
    </div>
  );
};

// ─── Add/Edit Item Form ─────────────────────────────────────

interface ItemFormData {
  name: string;
  category: AppearanceCategoryType;
  image: string;
  zIndex: number;
  tint: string;
}

const ItemForm: React.FC<{
  initial?: Partial<ItemFormData>;
  onSubmit: (data: ItemFormData) => void;
  onCancel: () => void;
  title: string;
}> = ({ initial, onSubmit, onCancel, title }) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<AppearanceCategoryType>(initial?.category ?? 'outfit');
  const [image, setImage] = useState(initial?.image ?? '');
  const [zIndex, setZIndex] = useState(initial?.zIndex ?? 10);
  const [tint, setTint] = useState(initial?.tint ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), category, image, zIndex, tint: tint || undefined } as ItemFormData);
  };

  return (
    <div className="appearance-form-overlay" onClick={onCancel}>
      <form className="appearance-form" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="appearance-form__title">{title}</div>

        <div className="appearance-form__row">
          <label>Name</label>
          <input type="text" className="input-text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Item name..." autoFocus />
        </div>

        <div className="appearance-form__row">
          <label>Category</label>
          <select className="input-select" value={category}
            onChange={(e) => setCategory(e.target.value as AppearanceCategoryType)}>
            {APPEARANCE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_ICONS[c]} {CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>

        <div className="appearance-form__row">
          <label>Image</label>
          <ImageUploadSlot label="Upload" currentImage={image} onUpload={setImage} size={100} />
        </div>

        <div className="appearance-form__row">
          <label>Z-Index (Layer Order)</label>
          <input type="number" className="input-text" value={zIndex}
            onChange={(e) => setZIndex(parseInt(e.target.value) || 0)} min={0} max={100} />
        </div>

        <div className="appearance-form__row">
          <label>Tint Color (optional)</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="color" value={tint || '#ffffff'} onChange={(e) => setTint(e.target.value)} />
            <input type="text" className="input-text" value={tint} onChange={(e) => setTint(e.target.value)}
              placeholder="#ffffff" style={{ flex: 1 }} />
            {tint && <button type="button" className="btn btn--xs" onClick={() => setTint('')}>Clear</button>}
          </div>
        </div>

        <div className="appearance-form__buttons">
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={!name.trim()}>Save</button>
        </div>
      </form>
    </div>
  );
};

// ─── Main Appearance Manager ────────────────────────────────

const AppearanceManager: React.FC = () => {
  const { state, dispatch } = useEditor();
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<AppearanceCategoryType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<AppearanceItem | null>(null);
  const [showAddPreset, setShowAddPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // Get characters from state
  const characters = state.project?.characters ?? [];
  const selectedChar = useMemo(
    () => characters.find((c: any) => c.id === selectedCharId) ?? characters[0] ?? null,
    [characters, selectedCharId],
  );

  // Appearance items for selected character
  const allItems: AppearanceItem[] = (selectedChar as any)?.appearanceItems ?? [];
  const presets: AppearancePreset[] = (selectedChar as any)?.appearancePresets ?? [];
  const activePresetId: string | undefined = (selectedChar as any)?.activePresetId;

  // Active preset's item IDs
  const activePreset = presets.find((p) => p.id === activePresetId);
  const equippedIds = new Set(activePreset?.itemIds ?? []);

  // Filter items
  const filteredItems = useMemo(() => {
    let items = allItems;
    if (filterCategory !== 'all') {
      items = items.filter((i) => i.category === filterCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((i) =>
        i.name.toLowerCase().includes(q) || i.category.includes(q),
      );
    }
    return items;
  }, [allItems, filterCategory, searchQuery]);

  // ─── Dispatch helpers ───────────────────────────────────

  const charId = selectedChar?.id;

  const handleAddItem = useCallback((data: ItemFormData) => {
    if (!charId) return;
    const item: AppearanceItem = {
      id: genId('appr'),
      name: data.name,
      category: data.category,
      image: data.image,
      zIndex: data.zIndex,
      tint: data.tint,
    };
    dispatch({ type: 'ADD_APPEARANCE_ITEM', characterId: charId, item } as any);
    setShowAddForm(false);
  }, [charId, dispatch]);

  const handleEditItem = useCallback((data: ItemFormData) => {
    if (!charId || !editingItem) return;
    const updated: AppearanceItem = {
      ...editingItem,
      name: data.name,
      category: data.category,
      image: data.image,
      zIndex: data.zIndex,
      tint: data.tint,
    };
    dispatch({ type: 'UPDATE_APPEARANCE_ITEM', characterId: charId, item: updated } as any);
    setEditingItem(null);
  }, [charId, editingItem, dispatch]);

  const handleDeleteItem = useCallback((itemId: string) => {
    if (!charId) return;
    dispatch({ type: 'REMOVE_APPEARANCE_ITEM', characterId: charId, itemId } as any);
  }, [charId, dispatch]);

  const handleToggleEquip = useCallback((itemId: string) => {
    if (!charId || !activePresetId) return;
    const newIds = equippedIds.has(itemId)
      ? [...equippedIds].filter((id) => id !== itemId)
      : [...equippedIds, itemId];
    dispatch({
      type: 'UPDATE_APPEARANCE_PRESET',
      characterId: charId,
      preset: { ...activePreset!, itemIds: newIds },
    } as any);
  }, [charId, activePresetId, activePreset, equippedIds, dispatch]);

  const handleActivatePreset = useCallback((presetId: string) => {
    if (!charId) return;
    dispatch({ type: 'SET_ACTIVE_PRESET', characterId: charId, presetId } as any);
  }, [charId, dispatch]);

  const handleAddPreset = useCallback(() => {
    if (!charId || !newPresetName.trim()) return;
    const preset: AppearancePreset = {
      id: genId('preset'),
      name: newPresetName.trim(),
      itemIds: [],
    };
    dispatch({ type: 'ADD_APPEARANCE_PRESET', characterId: charId, preset } as any);
    setNewPresetName('');
    setShowAddPreset(false);
  }, [charId, newPresetName, dispatch]);

  const handleDeletePreset = useCallback((presetId: string) => {
    if (!charId) return;
    dispatch({ type: 'REMOVE_APPEARANCE_PRESET', characterId: charId, presetId } as any);
  }, [charId, dispatch]);

  // ─── Render ─────────────────────────────────────────────

  if (characters.length === 0) {
    return (
      <div className="appearance-manager appearance-manager--empty">
        <p>No characters in the project. Add a character first.</p>
      </div>
    );
  }

  return (
    <div className="appearance-manager">
      {/* Character selector */}
      <div className="appearance-char-selector">
        <label className="appearance-char-selector__label">Character:</label>
        <div className="appearance-char-selector__list">
          {characters.map((c: any) => (
            <button key={c.id}
              className={`appearance-char-chip ${c.id === selectedChar?.id ? 'active' : ''}`}
              style={{ '--chip-color': c.color || '#666' } as React.CSSProperties}
              onClick={() => setSelectedCharId(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main content area */}
      <div className="appearance-content">
        {/* Left: Items */}
        <div className="appearance-items-panel">
          <div className="appearance-items-header">
            <h3>Appearance Items ({allItems.length})</h3>
            <button className="btn btn--primary btn--sm" onClick={() => setShowAddForm(true)}>
              + Add Item
            </button>
          </div>

          {/* Category filters */}
          <div className="appearance-filters">
            <button className={`filter-chip ${filterCategory === 'all' ? 'active' : ''}`}
              onClick={() => setFilterCategory('all')}>All</button>
            {APPEARANCE_CATEGORIES.map((cat) => {
              const count = allItems.filter((i) => i.category === cat).length;
              return (
                <button key={cat}
                  className={`filter-chip ${filterCategory === cat ? 'active' : ''}`}
                  onClick={() => setFilterCategory(cat)}>
                  {CATEGORY_ICONS[cat]} {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Search */}
          <input type="text" className="input-text appearance-search"
            placeholder="Search items..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} />

          {/* Items grid */}
          <div className="appearance-items-grid">
            {filteredItems.length === 0 ? (
              <div className="appearance-empty">
                No items found. Click "+ Add Item" to create one.
              </div>
            ) : (
              filteredItems.map((item) => (
                <AppearanceItemCard key={item.id} item={item}
                  isEquipped={equippedIds.has(item.id)}
                  onToggle={() => handleToggleEquip(item.id)}
                  onEdit={() => setEditingItem(item)}
                  onDelete={() => handleDeleteItem(item.id)} />
              ))
            )}
          </div>
        </div>

        {/* Right: Presets & Preview */}
        <div className="appearance-presets-panel">
          <div className="appearance-presets-header">
            <h3>Presets ({presets.length})</h3>
            <button className="btn btn--sm" onClick={() => setShowAddPreset(true)}>+ Preset</button>
          </div>

          {showAddPreset && (
            <div className="appearance-add-preset">
              <input type="text" className="input-text" value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="Preset name..." autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleAddPreset()} />
              <button className="btn btn--primary btn--xs" onClick={handleAddPreset}>Add</button>
              <button className="btn btn--xs" onClick={() => setShowAddPreset(false)}>Cancel</button>
            </div>
          )}

          <div className="appearance-presets-list">
            {presets.map((preset) => (
              <PresetCard key={preset.id} preset={preset}
                isActive={preset.id === activePresetId}
                itemCount={preset.itemIds.length}
                onActivate={() => handleActivatePreset(preset.id)}
                onDelete={() => handleDeletePreset(preset.id)} />
            ))}
          </div>

          {/* Layer Preview */}
          <div className="appearance-preview">
            <h4>Layer Preview</h4>
            <div className="appearance-preview__canvas">
              {activePreset ? (
                [...activePreset.itemIds]
                  .map((id) => allItems.find((i) => i.id === id))
                  .filter(Boolean)
                  .sort((a, b) => (a!.zIndex - b!.zIndex))
                  .map((item) => (
                    <div key={item!.id} className="appearance-preview__layer"
                      style={{ zIndex: item!.zIndex }}>
                      {item!.image ? (
                        <img src={item!.image} alt={item!.name} />
                      ) : (
                        <div className="appearance-preview__placeholder">
                          {CATEGORY_ICONS[item!.category]}
                        </div>
                      )}
                      <span className="appearance-preview__layer-label">
                        {item!.name} (z:{item!.zIndex})
                      </span>
                    </div>
                  ))
              ) : (
                <div className="appearance-preview__empty">Select a preset to preview layers</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Item Form Modal */}
      {showAddForm && (
        <ItemForm title="Add Appearance Item" onSubmit={handleAddItem}
          onCancel={() => setShowAddForm(false)} />
      )}

      {/* Edit Item Form Modal */}
      {editingItem && (
        <ItemForm title={`Edit: ${editingItem.name}`}
          initial={{
            name: editingItem.name,
            category: editingItem.category,
            image: editingItem.image,
            zIndex: editingItem.zIndex,
            tint: editingItem.tint,
          }}
          onSubmit={handleEditItem}
          onCancel={() => setEditingItem(null)} />
      )}
    </div>
  );
};

export default AppearanceManager;
