export type MessageData = {
  id?: string; // ID único del mensaje
  contactName?: string;
  fullJid?: string;
  result: unknown;
  tags?: any;
  msgInfo?: any;
  bizInfo?: any;
  
  // Propiedades de eliminación
  isDeleted?: boolean;
  originalContent?: string;
  deletedAt?: string; // ISO timestamp
  deletedReason?: string; // Ej: "Este mensaje fue eliminado"
  capturedAt?: string; // ISO timestamp del registro original
};

export type StorageMessage = {
  [key: string]: MessageData;
};
