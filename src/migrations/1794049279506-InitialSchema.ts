import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1794049279506 implements MigrationInterface {
  name = 'InitialSchema1794049279506';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('user')) {
      // The database was created with `schema:sync` before migrations existed.
      await this.upgradeSyncedSchema(queryRunner);
      return;
    }
    await queryRunner.query(`CREATE TYPE "public"."user_roles_enum" AS ENUM('standard', 'premium')`);
    await queryRunner.query(
      `CREATE TABLE "user" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "roles" "public"."user_roles_enum" NOT NULL DEFAULT 'standard', CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await this.createTaskTable(queryRunner);
  }

  private async createTaskTable(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."task_status_enum" AS ENUM('open', 'in_progress', 'done')`);
    await queryRunner.query(
      `CREATE TABLE "task" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "description" character varying, "status" "public"."task_status_enum" NOT NULL DEFAULT 'open', "ownerId" integer NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_fb213f79ee45060ba925ecd576e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_a132ba8200c3abdc271d4a701d" ON "task"  ("ownerId") `);
    await queryRunner.query(
      `ALTER TABLE "task" ADD CONSTRAINT "FK_a132ba8200c3abdc271d4a701d8" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  /**
   * Brings a database created by `schema:sync` (prime-nestjs 2.x) to this
   * schema without losing data. It stops with instructions instead of
   * guessing when existing rows need a decision.
   */
  private async upgradeSyncedSchema(queryRunner: QueryRunner): Promise<void> {
    const duplicates = (await queryRunner.query(`SELECT lower(trim("email")) AS "email" FROM "user" GROUP BY 1 HAVING count(*) > 1`)) as {
      email: string;
    }[];
    if (duplicates.length > 0) {
      throw new Error(
        `InitialSchema: ${duplicates.length} email address(es) exist in more than one letter case ` +
          `(for example ${duplicates[0].email}). Emails are now case-insensitive. Merge or rename those accounts, then run the migration again.`,
      );
    }
    await queryRunner.query(`UPDATE "user" SET "email" = lower(trim("email")) WHERE "email" <> lower(trim("email"))`);

    if (!(await queryRunner.hasTable('task'))) {
      await this.createTaskTable(queryRunner);
      return;
    }

    if (!(await queryRunner.hasColumn('task', 'ownerId'))) {
      const [{ count }] = (await queryRunner.query(`SELECT count(*) AS "count" FROM "task"`)) as { count: string }[];
      if (Number(count) > 0) {
        throw new Error(
          `InitialSchema: ${count} existing task(s) have no owner. Tasks now belong to a user. ` +
            `Run: ALTER TABLE "task" ADD "ownerId" integer; UPDATE "task" SET "ownerId" = <user id>; ` +
            `(or delete the tasks), then run the migration again.`,
        );
      }
      await queryRunner.query(`ALTER TABLE "task" ADD "ownerId" integer`);
    }

    const [{ count: orphans }] = (await queryRunner.query(
      `SELECT count(*) AS "count" FROM "task" t LEFT JOIN "user" u ON u."id" = t."ownerId" WHERE u."id" IS NULL`,
    )) as { count: string }[];
    if (Number(orphans) > 0) {
      throw new Error(`InitialSchema: ${orphans} task(s) have an ownerId that matches no user. Fix or delete them, then run the migration again.`);
    }

    await queryRunner.query(`ALTER TABLE "task" ALTER COLUMN "ownerId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "task" ALTER COLUMN "createdAt" TYPE TIMESTAMP WITH TIME ZONE USING "createdAt" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE "task" ALTER COLUMN "updatedAt" TYPE TIMESTAMP WITH TIME ZONE USING "updatedAt" AT TIME ZONE 'UTC'`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_a132ba8200c3abdc271d4a701d" ON "task" ("ownerId")`);
    await queryRunner.query(
      `ALTER TABLE "task" ADD CONSTRAINT "FK_a132ba8200c3abdc271d4a701d8" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "task" DROP CONSTRAINT "FK_a132ba8200c3abdc271d4a701d8"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a132ba8200c3abdc271d4a701d"`);
    await queryRunner.query(`DROP TABLE "task"`);
    await queryRunner.query(`DROP TYPE "public"."task_status_enum"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TYPE "public"."user_roles_enum"`);
  }
}
