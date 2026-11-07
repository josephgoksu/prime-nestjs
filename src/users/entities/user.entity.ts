import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Role } from '../enums/role.enum';

@Entity()
@Unique(['email'])
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  email: string;

  /** Never selected by default. Load it explicitly with UsersService.findByEmailWithPassword(). */
  @Column({ select: false })
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.standard,
  })
  roles: Role;
}
