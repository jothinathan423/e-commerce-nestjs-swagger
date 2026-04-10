import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CategoriesService } from '../categories/categories.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly categoriesService: CategoriesService,
  ) {}

  private assertId(id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(`Product #${id} not found`);
    }
  }

  async create(dto: CreateProductDto): Promise<ProductDocument> {
    await this.categoriesService.findOne(dto.categoryId);
    if (dto.price < 0) throw new BadRequestException('Price must be >= 0');
    if (dto.stock < 0) throw new BadRequestException('Stock must be >= 0');

    return this.productModel.create({
      name: dto.name,
      description: dto.description,
      price: dto.price,
      stock: dto.stock,
      categoryId: new Types.ObjectId(dto.categoryId),
    });
  }

  async findAll(filter?: {
    categoryId?: string;
    search?: string;
  }): Promise<ProductDocument[]> {
    const query: Record<string, unknown> = {};
    if (filter?.categoryId && isValidObjectId(filter.categoryId)) {
      query.categoryId = new Types.ObjectId(filter.categoryId);
    }
    if (filter?.search) {
      query.name = new RegExp(filter.search, 'i');
    }
    return this.productModel.find(query).exec();
  }

  async findOne(id: string): Promise<ProductDocument> {
    this.assertId(id);
    const product = await this.productModel.findById(id).exec();
    if (!product) throw new NotFoundException(`Product #${id} not found`);
    return product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductDocument> {
    this.assertId(id);
    if (dto.categoryId !== undefined) {
      await this.categoriesService.findOne(dto.categoryId);
    }
    if (dto.price !== undefined && dto.price < 0) {
      throw new BadRequestException('Price must be >= 0');
    }
    if (dto.stock !== undefined && dto.stock < 0) {
      throw new BadRequestException('Stock must be >= 0');
    }
    const update: Record<string, unknown> = { ...dto };
    if (dto.categoryId) update.categoryId = new Types.ObjectId(dto.categoryId);

    const product = await this.productModel
      .findByIdAndUpdate(id, update, { returnDocument: 'after' })
      .exec();
    if (!product) throw new NotFoundException(`Product #${id} not found`);
    return product;
  }

  async remove(id: string): Promise<{ deleted: true; id: string }> {
    this.assertId(id);
    const result = await this.productModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`Product #${id} not found`);
    return { deleted: true, id };
  }

  async decrementStock(id: string, quantity: number): Promise<ProductDocument> {
    this.assertId(id);
    const product = await this.productModel
      .findOneAndUpdate(
        { _id: id, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { returnDocument: 'after' },
      )
      .exec();
    if (!product) {
      const existing = await this.productModel.findById(id).exec();
      if (!existing) throw new NotFoundException(`Product #${id} not found`);
      throw new BadRequestException(
        `Insufficient stock for product #${id}. Available: ${existing.stock}`,
      );
    }
    return product;
  }

  async incrementStock(id: string, quantity: number): Promise<ProductDocument> {
    this.assertId(id);
    const product = await this.productModel
      .findByIdAndUpdate(id, { $inc: { stock: quantity } }, { returnDocument: 'after' })
      .exec();
    if (!product) throw new NotFoundException(`Product #${id} not found`);
    return product;
  }
}
