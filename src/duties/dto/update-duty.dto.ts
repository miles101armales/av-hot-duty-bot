import { PartialType } from '@nestjs/mapped-types';
import { CreateDutyDto } from './create-duty.dto';

export class UpdateDutyDto extends PartialType(CreateDutyDto) {}
