import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrganizations1794054259967 implements MigrationInterface {
  name = 'AddOrganizations1794054259967';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "organization" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_472c1f99a32def1b0abb219cd67" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE TYPE "public"."membership_role_enum" AS ENUM('owner', 'admin', 'member')`);
    await queryRunner.query(
      `CREATE TABLE "membership" ("id" SERIAL NOT NULL, "organizationId" integer NOT NULL, "userId" integer NOT NULL, "role" "public"."membership_role_enum" NOT NULL DEFAULT 'member', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_db862050fbbf3f0a15b2a8f2245" UNIQUE ("organizationId", "userId"), CONSTRAINT "PK_83c1afebef3059472e7c37e8de8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_eef2d9d9c70cd13bed868afedf" ON "membership"  ("userId") `);
    await queryRunner.query(`ALTER TABLE "task" ADD "organizationId" integer`);
    await queryRunner.query(`CREATE INDEX "IDX_5b0272d923a31c972bed1a1ac4" ON "task"  ("organizationId") `);
    await queryRunner.query(
      `ALTER TABLE "task" ADD CONSTRAINT "FK_5b0272d923a31c972bed1a1ac4d" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "membership" ADD CONSTRAINT "FK_4c62c8a7ba2337d6d6ffcd8eb6d" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "membership" ADD CONSTRAINT "FK_eef2d9d9c70cd13bed868afedf4" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "membership" DROP CONSTRAINT "FK_eef2d9d9c70cd13bed868afedf4"`);
    await queryRunner.query(`ALTER TABLE "membership" DROP CONSTRAINT "FK_4c62c8a7ba2337d6d6ffcd8eb6d"`);
    // Organization tasks would otherwise turn into personal tasks of their creators.
    await queryRunner.query(`DELETE FROM "task" WHERE "organizationId" IS NOT NULL`);
    await queryRunner.query(`ALTER TABLE "task" DROP CONSTRAINT "FK_5b0272d923a31c972bed1a1ac4d"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5b0272d923a31c972bed1a1ac4"`);
    await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "organizationId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_eef2d9d9c70cd13bed868afedf"`);
    await queryRunner.query(`DROP TABLE "membership"`);
    await queryRunner.query(`DROP TYPE "public"."membership_role_enum"`);
    await queryRunner.query(`DROP TABLE "organization"`);
  }
}
