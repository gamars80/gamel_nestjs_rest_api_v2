import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { UserService } from 'src/user/user.service';
import { RefreshToken } from './entity/refresh-token.entity';
import { DataSource, Repository } from 'typeorm';
import { User } from 'src/user/entity/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private userService: UserService, 
    private dataSource: DataSource,
    private jwtService: JwtService, 
    @InjectRepository(RefreshToken) private refreshTokenRepository: Repository<RefreshToken>,  
  ) {}

  async signup(email: string, password: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let error;
    try{
      const user = await this.userService.findOneByEmail(email);
      if (user) throw new BadRequestException();

      const saltRounds = 10;
      const hash = await bcrypt.hash(password, saltRounds);

      const userEntity = queryRunner.manager.create(User, { email, password: hash});
      await queryRunner.manager.save(userEntity);

      const accessToken = this.generateAccessToken(userEntity.id);
      const refreshToken = this.generateRefreshToken(userEntity.id);
      const refreshTokenEntity = queryRunner.manager.create(RefreshToken, {
        user: {id: userEntity.id},
        token: refreshToken
      })

      await queryRunner.manager.save(refreshTokenEntity);
      await queryRunner.commitTransaction();

      return {id: userEntity.id, accessToken, refreshToken};

    }catch(e) {
      await queryRunner.rollbackTransaction();
      error = e;
    }finally{
      await queryRunner.release();
      if(error) throw error;
    }
   
    
  }

  async signin(email: string, password: string) {
    const user = await this.validateUser(email, password);

    const refreshToken = await this.generateRefreshToken(user.id);
    await this.createRefreshTokenUsingUser(user.id, refreshToken);

    return {
      accessToken: this.generateAccessToken(user.id),
      refreshToken,
    };
  }

  async refresh(token: string, userId: string) {
    //해당 토큰이 db에 있는지
    const refreshTokenEntity = await this.refreshTokenRepository.findOneBy({ token })

    if(!refreshTokenEntity) throw new BadRequestException();

    //새로운 엑세스 토큰과 리플레시 토큰 생성
    const accessToken = this.generateAccessToken(userId);
    const refreshToken = this.generateRefreshToken(userId);

    refreshTokenEntity.token = refreshToken;
    await this.refreshTokenRepository.save(refreshTokenEntity);
    return { accessToken, refreshToken };
  }

  private generateAccessToken(userId: string) {
    const payload = { sub: userId, tokenType: 'access'};
    return this.jwtService.sign(payload, {expiresIn: '1d'});
  }

  private generateRefreshToken(userId: string) {
    const payload = { sub: userId, tokenType: 'refresh'};
    return this.jwtService.sign(payload, {expiresIn: '30d'});
  }

  private async createRefreshTokenUsingUser(userId: string, refreshToken: string) {
    let refreshTokenEntity = await this.refreshTokenRepository.findOneBy({ user: {id: userId}});
    if(refreshTokenEntity) {
      refreshTokenEntity.token = refreshToken;
    }else{
      refreshTokenEntity = this.refreshTokenRepository.create({user: {id: userId}, token: refreshToken})
    }

    await this.refreshTokenRepository.save(refreshTokenEntity);

  }
  
  private async validateUser(email: string, password: string): Promise<User> {
    const user = await this.userService.findOneByEmail(email);
    if (!user) throw new UnauthorizedException();

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException();

    return user;

  }
}
