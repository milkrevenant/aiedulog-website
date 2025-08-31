/**
 * Strict type definitions for embed components
 * Using readonly properties to prevent mutations and ensure type safety
 */

// Base interfaces
export interface BaseEmbedItem {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt?: string;
}

// Todo Types
export interface TodoItem extends BaseEmbedItem {
  readonly text: string;
  readonly completed: boolean;
  readonly completedAt?: string;
  readonly priority?: 'low' | 'medium' | 'high';
  readonly dueDate?: string;
  readonly assignee?: string;
  readonly tags?: readonly string[];
  readonly description?: string;
  readonly estimatedHours?: number;
  readonly actualHours?: number;
  readonly category?: string;
  readonly progress?: number;
}

export interface TodoData {
  readonly items: readonly TodoItem[];
  readonly categories?: readonly string[];
  readonly settings?: {
    readonly showCompleted: boolean;
    readonly defaultPriority: 'low' | 'medium' | 'high';
    readonly autoArchive: boolean;
  };
}

// Kanban Types
export interface KanbanCard extends BaseEmbedItem {
  readonly title: string;
  readonly description?: string;
  readonly assignee?: string;
  readonly priority?: 'low' | 'medium' | 'high';
  readonly tags?: readonly string[];
  readonly dueDate?: string;
  readonly estimatedHours?: number;
  readonly progress?: number;
}

export interface KanbanColumn {
  readonly id: string;
  readonly title: string;
  readonly cards: readonly KanbanCard[];
  readonly limit?: number;
  readonly color?: string;
}

export interface KanbanData {
  readonly columns: readonly KanbanColumn[];
  readonly settings?: {
    readonly allowDragBetweenColumns: boolean;
    readonly maxCardsPerColumn?: number;
  };
}

// Poll Types
export interface PollOption {
  readonly id: string;
  readonly text: string;
  readonly votes: number;
  readonly voters?: readonly string[];
}

export interface PollData {
  readonly question: string;
  readonly options: readonly PollOption[];
  readonly allowMultiple: boolean;
  readonly anonymous: boolean;
  readonly createdAt: string;
  readonly endsAt?: string;
  readonly allowAddOptions?: boolean;
  readonly currentUserVotes?: readonly string[];
  readonly settings?: {
    readonly requireAuth: boolean;
    readonly showResults: 'always' | 'afterVote' | 'afterEnd';
  };
}

// Excalidraw Types
export interface ExcalidrawElement {
  readonly id: string;
  readonly type: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly angle?: number;
  readonly strokeColor?: string;
  readonly backgroundColor?: string;
  readonly fillStyle?: string;
  readonly strokeWidth?: number;
  readonly strokeStyle?: string;
  readonly roughness?: number;
  readonly opacity?: number;
  readonly text?: string;
  readonly fontSize?: number;
  readonly fontFamily?: number;
  readonly textAlign?: string;
  readonly verticalAlign?: string;
}

export interface ExcalidrawData {
  readonly elements: readonly ExcalidrawElement[];
  readonly appState: {
    readonly viewBackgroundColor: string;
    readonly gridSize?: number;
    readonly zoom?: number;
    readonly scrollX?: number;
    readonly scrollY?: number;
  };
  readonly files?: Record<string, any>;
}

// Generic Embed Container Types
export type EmbedType = 'todo' | 'kanban' | 'poll' | 'excalidraw';

export type EmbedData = TodoData | KanbanData | PollData | ExcalidrawData;

export interface EmbedMetadata {
  readonly id: string;
  readonly type: EmbedType;
  readonly title: string;
  readonly messageId: string;
  readonly permissions: {
    readonly view: 'all' | 'participants' | 'owner';
    readonly edit: 'all' | 'participants' | 'owner';
  };
  readonly sizeConfig: {
    readonly width: number;
    readonly height: number;
    readonly minWidth?: number;
    readonly minHeight?: number;
    readonly maxWidth?: number;
    readonly maxHeight?: number;
  };
  readonly collaborationEnabled: boolean;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface EmbedContainer {
  readonly metadata: EmbedMetadata;
  readonly data: EmbedData;
}

// Update functions return types
export type TodoUpdater = (data: TodoData) => TodoData;
export type KanbanUpdater = (data: KanbanData) => KanbanData;
export type PollUpdater = (data: PollData) => PollData;
export type ExcalidrawUpdater = (data: ExcalidrawData) => ExcalidrawData;

// Component Props Types
export interface BaseEmbedProps<T> {
  readonly data: T;
  readonly onChange: (data: T) => void;
  readonly readOnly?: boolean;
  readonly width?: number;
  readonly height?: number;
  readonly collaborationEnabled?: boolean;
  readonly currentUserId?: string;
  readonly currentUserName?: string;
}