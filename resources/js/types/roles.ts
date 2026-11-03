export type RoleRow = {
    id: number;
    name: string;
    users_count: number;
    permissions: string[];
    is_locked: boolean;
    is_built_in: boolean;
    /** Permissions this role must always keep (the owner keeps role.manage). */
    required: string[];
    can_delete: boolean;
};

export type CatalogPermission = { name: string; label: string; description: string | null };

export type CatalogGroup = { key: string; label: string; permissions: CatalogPermission[] };
