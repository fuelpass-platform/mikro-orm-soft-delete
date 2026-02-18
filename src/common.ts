export const SOFT_DELETABLE = Symbol("soft-deletable");

export const SOFT_DELETABLE_FILTER = "soft-deletable-filter";

export const SOFT_DELETE_CONTEXT = Symbol("soft-delete-context");

export interface SoftDeleteContext {
  /**
   * The current user/actor performing the deletion.
   */
  deletedBy?: any;
}

export interface SoftDeletableConfig<Entity, Field extends keyof Entity> {
  /**
   * Identifier field used to identify deleted entities.
   */
  field: Field;

  /**
   * Value to set to the identifier field in deletions.
   */
  value: () => Entity[Field];

  /**
   * Value to identify entities that is NOT soft-deleted. Defaults to `null`.
   */
  valueInitial?: Entity[Field];

  /**
   * Optional field to track who deleted the entity.
   */
  deletedByField?: keyof Entity;

  /**
   * Optional function to get the current user/actor performing the deletion.
   * If not provided, will attempt to read from SoftDeleteContext.
   */
  getDeletedBy?: () => any;
}
