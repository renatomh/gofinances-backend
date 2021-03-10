import { getCustomRepository, getRepository } from 'typeorm';

import AppError from '../errors/AppError';

import TransactionsRepository from '../repositories/TransactionsRepository';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface Request {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class CreateTransactionService {
  public async execute({ title, value, type, category }: Request): Promise<Transaction> {
    // Criando os repositórios de transações e categorias
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    // Verificando se o saldo é suficiente para cadastrar a nova transação
    const { total } = await transactionsRepository.getBalance();
    if (type == "outcome" && total < value) {
      throw new AppError("You do not have enough balance.");
    }

    // Verificando se a categoria já existe
    let transactionCategory = await categoriesRepository.findOne({
      where: {
        title: category,
      },
    });

    // Caso não exsita, criamos a categoria e depois utilizamos o id retornado
    if (!transactionCategory) {
      transactionCategory = categoriesRepository.create({
        title: category,
      })
      await categoriesRepository.save(transactionCategory);
    }
    // Caso exista, somente utilizamos o id retornando

    // Criando a nova transação no banco de dados
    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category: transactionCategory,
    })

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
