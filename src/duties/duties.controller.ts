import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DutiesService } from './duties.service';
import { CreateDutyDto } from './dto/create-duty.dto';
import { UpdateDutyDto } from './dto/update-duty.dto';

@Controller('duties')
export class DutiesController {
  constructor(private readonly dutiesService: DutiesService) {}

  @Post()
  create(@Body() createDutyDto: CreateDutyDto) {
    return this.dutiesService.create(createDutyDto);
  }

  @Get()
  findAll() {
    return this.dutiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dutiesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDutyDto: UpdateDutyDto) {
    return this.dutiesService.update(+id, updateDutyDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.dutiesService.remove(+id);
  }
}
