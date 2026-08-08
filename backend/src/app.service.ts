import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo() {
    return {
      name: 'Insights API',
      description: 'Company management tool backend',
      status: 'ok',
    };
  }
}
