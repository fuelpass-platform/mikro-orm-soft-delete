import {
  ChangeSet,
  ChangeSetType,
  EventSubscriber,
  FlushEventArgs,
  MikroORM,
} from "@mikro-orm/core";

import { SOFT_DELETABLE, SOFT_DELETE_CONTEXT, SoftDeletableConfig } from "./common";

/**
 * Intercept deletions of soft-deletable entities and perform updates instead.
 *
 * @see SoftDeletable
 * @see https://github.com/mikro-orm/mikro-orm/issues/1492#issuecomment-785394397
 */
export class SoftDeleteHandler implements EventSubscriber {
  static register(orm: MikroORM): void {
    orm.em.getEventManager().registerSubscriber(new this());
  }

  async onFlush({ uow }: FlushEventArgs): Promise<void> {
    uow
      .getChangeSets()
      .forEach(
        <Entity extends object, Field extends keyof Entity>(
          item: ChangeSet<Entity>,
        ) => {
          console.log("[SoftDeleteHandler] Processing changeset:", {
            type: item.type,
            entityName: item.entity.constructor.name,
            hasSoftDeletableMetadata: Reflect.hasMetadata(SOFT_DELETABLE, item.entity.constructor),
          });

          if (
            item.type === ChangeSetType.DELETE &&
            Reflect.hasMetadata(SOFT_DELETABLE, item.entity.constructor)
          ) {
            console.log("[SoftDeleteHandler] Soft-deleting entity:", item.entity.constructor.name);

            const config: SoftDeletableConfig<Entity, Field> =
              Reflect.getMetadata(SOFT_DELETABLE, item.entity.constructor);
            const { field, value, deletedByField, getDeletedBy } = config;

            console.log("[SoftDeleteHandler] Config:", {
              field,
              deletedByField,
              hasGetDeletedBy: !!getDeletedBy,
            });

            item.type = ChangeSetType.UPDATE;
            item.entity[field] = value();
            item.payload[field] = value();

            console.log("[SoftDeleteHandler] Set", field, "to:", item.entity[field]);

            // Set deletedBy field if configured
            if (deletedByField) {
              let deletedByValue: any;

              if (getDeletedBy) {
                // Use provided function
                deletedByValue = getDeletedBy();
                console.log("[SoftDeleteHandler] Got deletedBy from function:", deletedByValue);
              } else {
                // Try to get from context
                const context = Reflect.getMetadata(
                  SOFT_DELETE_CONTEXT,
                  item.entity.constructor,
                );
                deletedByValue = context?.deletedBy;
                console.log("[SoftDeleteHandler] Got deletedBy from context:", deletedByValue);
              }

              if (deletedByValue !== undefined) {
                item.entity[deletedByField] = deletedByValue;
                item.payload[deletedByField] = deletedByValue;
                console.log("[SoftDeleteHandler] Set", deletedByField, "to:", deletedByValue);
              }
            }

            // Don't recompute here. Otherwise ManyToOne relation fields will be
            // set to `null` and cause a `NotNullConstraintViolationException`.
            // This only appear when using `cascade: [Cascade.ALL],
            // it will be fine to recompute here when using
            // `orphanRemoval: true`.
            // But because we can't catch the deletions caused by
            // `orphanRemoval`, we still chose `cascade: [Cascade.ALL],
            // uow.recomputeSingleChangeSet(item.entity);
          }
        },
      );
  }
}
