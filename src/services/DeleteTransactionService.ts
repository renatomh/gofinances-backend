import AppError from '../errors/AppError';

import { getCustomRepository } from 'typeorm';

import Transaction from '../models/Transaction';

import TransactionsRepository from '../repositories/TransactionsRepository';

class DeleteTransactionService {
  public async execute(id: string): Promise<void> {
    // Primeiro verificamos se o registro existe no banco de dados
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const transaction = await transactionsRepository.findOne(id);

    // Caso não exista
    if (!transaction) {
      throw new AppError("Transaction does not exist.");
    }

    // Caso exista, removesmo a transação
    const response = await transactionsRepository.remove(transaction);
  }
}

export default DeleteTransactionService;
