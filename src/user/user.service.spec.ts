import { UserService } from 'src/user/user.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entity/user.entity';
import exp from 'constants';
import { beforeEach } from 'node:test';


class MockRepository {
    async findOneBy(query) {
        const user: User = new User();
        user.email = query.email;
        return user;
    }
}

describe('User', () => {
    let userService: UserService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                {
                    provide: getRepositoryToken(User),
                    useClass: MockRepository,
                }
            ]
        }).compile();

        userService = module.get<UserService>(UserService);
    })

    it('should', async () => {
        const email = 'gamel@gmail.com';
        const result = await userService.findOneByEmail(email);
        expect(result.email).toBe(email); // 위에서 선언한 이메일과 실제 데이터베이스에서 가져온 이메일과 같은지
    })
})