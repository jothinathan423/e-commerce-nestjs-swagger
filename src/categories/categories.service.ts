import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  private assertId(id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(`Category #${id} not found`);
    }
  }

  async create(dto: CreateCategoryDto): Promise<CategoryDocument> {
    const existing = await this.categoryModel
      .findOne({ name: new RegExp(`^${dto.name}$`, 'i') })
      .exec();
    if (existing) {
      throw new ConflictException(`Category '${dto.name}' already exists`);
    }
    return this.categoryModel.create(dto);
  }

  async findAll(): Promise<CategoryDocument[]> {
    return this.categoryModel.find().exec();
  }

  async findOne(id: string): Promise<CategoryDocument> {
    this.assertId(id);
    const category = await this.categoryModel.findById(id).exec();
    if (!category) throw new NotFoundException(`Category #${id} not found`);
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryDocument> {
    this.assertId(id);
    const category = await this.categoryModel
      .findByIdAndUpdate(id, dto, { returnDocument: 'after' })
      .exec();
    if (!category) throw new NotFoundException(`Category #${id} not found`);
    return category;
  }

  async remove(id: string): Promise<{ deleted: true; id: string }> {
    this.assertId(id);
    const result = await this.categoryModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`Category #${id} not found`);
    return { deleted: true, id };
  }
}
