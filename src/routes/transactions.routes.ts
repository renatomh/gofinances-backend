import { Router } from 'express';
import multer from 'multer';

import { getCustomRepository } from 'typeorm';

import TransactionsRepository from '../repositories/TransactionsRepository';
import CreateTransactionService from '../services/CreateTransactionService';
import DeleteTransactionService from '../services/DeleteTransactionService';
import ImportTransactionsService from '../services/ImportTransactionsService';

import uploadConfig from '../config/upload';

// Instaciando o multer
const upload = multer(uploadConfig);

const transactionsRouter = Router();

transactionsRouter.get('/', async (request, response) => {
  // Instanciando o repositório para listar os registros
  const transactionsRepository = getCustomRepository(TransactionsRepository);

  // Solicitando a lista de repositórios
  const transactions = await transactionsRepository.find();
  const balance = await transactionsRepository.getBalance();

  return response.json({ transactions, balance });
});

transactionsRouter.post('/', async (request, response) => {
  // Pegando os dados do corpo da requisição
  const { title, value, type, category } = request.body;

  // Pegando o serviço para a criação de uma nova transação
  const createTransactionService = new CreateTransactionService();

  // Chamando a execução da única função do serviço
  const transaction = await createTransactionService.execute({
    title, value, type, category,
  });

  return response.json(transaction);
});

transactionsRouter.delete('/:id', async (request, response) => {
  // Pegando os dados dos parâmetros da requisição
  const { id } = request.params;

  // Removendo a transação
  const deleteTransactionService = new DeleteTransactionService();
  await deleteTransactionService.execute(id);

  // Retornando a resposta com o corpo vazio e o status 204
  return response.status(204).send();
});

// Rota para importação de dados em arquivos
transactionsRouter.post(
  '/import',
  upload.single('file'),
  async (request, response) => {
    // Pegando o serviço para a importação das transações
    const importTransactions = new ImportTransactionsService();

    // Chamando a execução da única função do serviço
    const transactions = await importTransactions.execute(request.file.path);

    return response.json(transactions);
  });

export default transactionsRouter;
