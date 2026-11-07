import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersDTO } from './dto/create-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly usersRepository: Repository<User>) {}

  create(createUserDto: UsersDTO): Promise<User> {
    const user = new User();

    user.name = createUserDto.name;
    user.email = createUserDto.email;
    user.password = createUserDto.password;

    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      select: { id: true, name: true, email: true, isActive: true, roles: true },
    });
  }

  findOne(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
    });
  }

  /** Includes the password hash, which is excluded from every other query. Use for credential checks only. */
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository.createQueryBuilder('user').addSelect('user.password').where('user.email = :email', { email }).getOne();
  }

  findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
    });
  }

  async updatePassword(id: number, passwordHash: string): Promise<void> {
    await this.usersRepository.update(id, { password: passwordHash });
  }

  async remove(id: number): Promise<void> {
    await this.usersRepository.delete(id);
  }
}
