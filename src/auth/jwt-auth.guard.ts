import { Logger, LoggerService } from '@nestjs/common';
import { UserService } from './../user/user.service';
import { ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from 'src/common/decorator/public.decorator';
import { ROLES_KEY } from 'src/common/decorator/role.decorator';
import { Role } from 'src/user/enum/user.enum';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private jwtService: JwtService, 
    private userService: UserService,
    ) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    //refresh api를 호출했을때에만 리프레쉬 토큰 이용하도록
    //어떤 엔드포인트인지 확인
    //토큰타입이 refresh인지 체크
    const http = context.switchToHttp();

    //url과 headers에 접근 가능해짐
    const {url, headers} = http.getRequest<Request>();
    const token = /Bearer\s(.+)/.exec(headers['authorization'])[1];
    //디코딩
    const decoded = this.jwtService.decode(token);

    if(url !== '/api/auth/refresh' && decoded['tokenType'] === 'refresh') {
      console.log(this.logger);
      const error = new UnauthorizedException('accessToken is required');
      this.logger.error(error.message, error.stack);
      throw error;
    }

    const requireRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ])

    if( requireRoles ) {
      const userId = decoded['sub'];
      return this.userService.checkUserIsAdmin(userId);

    }

    return super.canActivate(context);
  }
}
