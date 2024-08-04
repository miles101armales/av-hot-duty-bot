import { Injectable } from '@nestjs/common';
import { CreateDutyDto } from './dto/create-duty.dto';
import { UpdateDutyDto } from './dto/update-duty.dto';

@Injectable()
export class DutiesService {
  create(createDutyDto: CreateDutyDto) {
    return 'This action adds a new duty';
  }

  findAll() {
    return `This action returns all duties`;
  }

  findOne(id: number) {
    return `This action returns a #${id} duty`;
  }

  update(id: number, updateDutyDto: UpdateDutyDto) {
    return `This action updates a #${id} duty`;
  }

  remove(id: number) {
    return `This action removes a #${id} duty`;
  }
}
