import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;

  const mockRepository = {
    save: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    createQueryBuilder: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a user', async () => {
      const createUserDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      const savedUser = {
        id: 1,
        ...createUserDto,
        isActive: true,
        roles: 'standard',
      };

      mockRepository.save.mockResolvedValue(savedUser);

      const result = await service.create(createUserDto);

      expect(mockRepository.save).toHaveBeenCalledWith(expect.objectContaining(createUserDto));
      expect(result).toEqual(savedUser);
    });

    it('stores the email trimmed and lowercased', async () => {
      mockRepository.save.mockResolvedValue({});

      await service.create({ name: 'Test User', email: ' Test@Example.COM ', password: 'password123' });

      expect(mockRepository.save).toHaveBeenCalledWith(expect.objectContaining({ email: 'test@example.com' }));
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const users = [
        { id: 1, name: 'User 1', email: 'user1@example.com' },
        { id: 2, name: 'User 2', email: 'user2@example.com' },
      ];

      mockRepository.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalledWith({
        select: { id: true, name: true, email: true, isActive: true, roles: true },
      });
      expect(result).toEqual(users);
    });
  });

  describe('findByEmailWithPassword', () => {
    it('selects the password hash explicitly', async () => {
      const user = { id: 1, email: 'test@example.com', password: 'hash' };
      const qb = {
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(user),
      };
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findByEmailWithPassword('test@example.com');

      expect(qb.addSelect).toHaveBeenCalledWith('user.password');
      expect(qb.where).toHaveBeenCalledWith('user.email = :email', { email: 'test@example.com' });
      expect(result).toEqual(user);
    });

    it('looks the email up trimmed and lowercased', async () => {
      const qb = {
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(null),
      };
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findByEmailWithPassword('  Test@Example.COM ');

      expect(qb.where).toHaveBeenCalledWith('user.email = :email', { email: 'test@example.com' });
    });
  });

  describe('updatePassword', () => {
    it('updates only the password column', async () => {
      await service.updatePassword(1, 'new-hash');
      expect(mockRepository.update).toHaveBeenCalledWith(1, { password: 'new-hash' });
    });
  });

  describe('findById', () => {
    it('should return a user by id', async () => {
      const user = { id: 1, name: 'Test User', email: 'test@example.com', password: 'hashedpassword' };

      mockRepository.findOne.mockResolvedValue(user);

      const result = await service.findById(1);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(user);
    });

    it('should return null when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('should delete a user by id', async () => {
      const id = 1;
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove(id);

      expect(mockRepository.delete).toHaveBeenCalledWith(id);
    });
  });
});
