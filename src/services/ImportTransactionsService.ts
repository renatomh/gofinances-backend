import { getCustomRepository, getRepository, In } from 'typeorm';
import csvParse from 'csv-parse';
import fs from 'fs';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

import TransactionsRepository from '../repositories/TransactionsRepository';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    // Obtendo os repositórios
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    // Criando o stream de leitura para o arquivo
    const contactsReadStream = fs.createReadStream(filePath);
    // Criando o parser para o arquivo CSV
    const parsers = csvParse({
      // Definindo que há uma linha de cabeçalho (header) que é a 1, e os dados começam na linha 2
      from_line: 2,
    });
    const parseCSV = contactsReadStream.pipe(parsers);

    // Inicializando as listas de dados
    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    // Lendos as linhas do arquivo
    parseCSV.on('data', async line => {
      // Mapeando as linhas em uma lista de valores
      const [title, type, value, category] = line.map((cell: string) =>
        // Removendo os espaços após as vírgulas
        cell.trim()
      );

      // Verificando se os dados passados estão corretos
      // Caso não esteja, retornamos
      if (!title || !type || !value) return;

      // Inserindo os dados de transações e categorias nas listas
      categories.push(category);
      transactions.push({ title, type, value, category });
    });

    // Esperando a execução da função
    await new Promise(resolve => parseCSV.on('end', resolve));

    // Verificando se as categorias já existem no banco de dados
    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      }
    });
    // Pegando somente os títulos das categorias
    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title
    );
    // Definindo a lista de categorias a serem criadas (as que ainda não estão inseridas)
    const addCategoryTitles = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      // Filtrando também para evitar inserir valores repetidos
      .filter((value, index, self) => self.indexOf(value) == index);

    // Inserindo as novas categorias no banco de dados
    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    )
    await categoriesRepository.save(newCategories);

    // Pegando agora todas as categorias do banco de dados
    const finalCategories = [...newCategories, ...existentCategories];

    // Criando as novas transações no banco de dados
    const createdTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        // Pesquisando a categoria na lista das que forma criadas
        category: finalCategories.find(
          category => category.title == transaction.category
        ),
      })),
    )
    await transactionsRepository.save(createdTransactions);

    // Removendo ainda o arquivo carregado
    await fs.promises.unlink(filePath);

    // Mostramos a lista de categorias e transações a serem importadas
    // console.log(addCategoryTitles);
    // console.log(categories);
    // console.log(transactions);

    // Ao final, retornamos todas as transações criadas
    return createdTransactions;
  }
}

export default ImportTransactionsService;
