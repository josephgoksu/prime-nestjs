import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshTokens1794053122526 implements MigrationInterface {
  name = 'AddRefreshTokens1794053122526';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "refresh_token" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "userId" integer NOT NULL, "familyId" uuid NOT NULL, "tokenHash" character varying(64) NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "revokedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b575dd3c21fb0831013c909e7fe" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_8e913e288156c133999341156a" ON "refresh_token"  ("userId") `);
    await queryRunner.query(`CREATE INDEX "IDX_b803086815f2d539fe7a0349d1" ON "refresh_token"  ("familyId") `);
    await queryRunner.query(`CREATE INDEX "IDX_c03a9271901099da2a840b0312" ON "refresh_token"  ("expiresAt") `);
    await queryRunner.query(
      `ALTER TABLE "refresh_token" ADD CONSTRAINT "FK_8e913e288156c133999341156ad" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "refresh_token" DROP CONSTRAINT "FK_8e913e288156c133999341156ad"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c03a9271901099da2a840b0312"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b803086815f2d539fe7a0349d1"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8e913e288156c133999341156a"`);
    await queryRunner.query(`DROP TABLE "refresh_token"`);
  }
}
