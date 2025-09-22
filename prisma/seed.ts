import {
  Difficulty,
  InterviewLevel,
  PrismaClient,
  ProgramType,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Начинаем заполнение базы данных...");

  // Создаем программы обучения
  const mockInterviewProgram = await prisma.program.upsert({
    where: { name: "Мок-собеседование" },
    update: {},
    create: {
      name: "Мок-собеседование",
      description: "Подготовка к собеседованию на фронтенд разработчика",
      type: ProgramType.MOCK_INTERVIEW,
      order: 1,
    },
  });

  const topicStudyProgram = await prisma.program.upsert({
    where: { name: "Изучение по темам" },
    update: {},
    create: {
      name: "Изучение по темам",
      description: "Изучение конкретных тем и технологий",
      type: ProgramType.TOPIC_STUDY,
      order: 2,
    },
  });

  console.log("✅ Программы созданы");

  // Создаем категории для мок-собеседования
  const reactCategory = await prisma.category.upsert({
    where: { name: "React" },
    update: {},
    create: {
      name: "React",
      description: "Библиотека для создания пользовательских интерфейсов",
      icon: "⚛️",
      programId: mockInterviewProgram.id,
      order: 1,
    },
  });

  const htmlCategory = await prisma.category.upsert({
    where: { name: "HTML" },
    update: {},
    create: {
      name: "HTML",
      description: "Язык разметки гипертекста",
      icon: "🌐",
      programId: mockInterviewProgram.id,
      order: 2,
    },
  });

  const cssCategory = await prisma.category.upsert({
    where: { name: "CSS" },
    update: {},
    create: {
      name: "CSS",
      description: "Каскадные таблицы стилей",
      icon: "🎨",
      programId: mockInterviewProgram.id,
      order: 3,
    },
  });

  const httpCategory = await prisma.category.upsert({
    where: { name: "HTTP/HTTPS" },
    update: {},
    create: {
      name: "HTTP/HTTPS",
      description: "Протоколы передачи данных",
      icon: "🌍",
      programId: mockInterviewProgram.id,
      order: 4,
    },
  });

  const browserCategory = await prisma.category.upsert({
    where: { name: "Браузер" },
    update: {},
    create: {
      name: "Браузер",
      description: "Веб-браузеры и их особенности",
      icon: "🌐",
      programId: mockInterviewProgram.id,
      order: 5,
    },
  });

  console.log("✅ Категории созданы");

  // Создаем подтемы для React
  const hooksSubcategory = await prisma.subcategory.upsert({
    where: { categoryId_name: { categoryId: reactCategory.id, name: "Хуки" } },
    update: {},
    create: {
      name: "Хуки",
      description: "useState, useEffect, useContext и другие хуки",
      categoryId: reactCategory.id,
      order: 1,
    },
  });

  const stateSubcategory = await prisma.subcategory.upsert({
    where: {
      categoryId_name: { categoryId: reactCategory.id, name: "Состояние" },
    },
    update: {},
    create: {
      name: "Состояние",
      description: "Управление состоянием компонентов",
      categoryId: reactCategory.id,
      order: 2,
    },
  });

  const renderingSubcategory = await prisma.subcategory.upsert({
    where: {
      categoryId_name: { categoryId: reactCategory.id, name: "Рендеринг" },
    },
    update: {},
    create: {
      name: "Рендеринг",
      description: "Процесс рендеринга компонентов",
      categoryId: reactCategory.id,
      order: 3,
    },
  });

  const componentsSubcategory = await prisma.subcategory.upsert({
    where: {
      categoryId_name: { categoryId: reactCategory.id, name: "Компоненты" },
    },
    update: {},
    create: {
      name: "Компоненты",
      description: "Функциональные и классовые компоненты",
      categoryId: reactCategory.id,
      order: 4,
    },
  });

  console.log("✅ Подтемы созданы");

  // Создаем вопросы для React - Хуки
  const hooksQuestions = [
    {
      question: "Что такое useState в React?",
      options: JSON.stringify([
        "Хук для управления состоянием компонента",
        "Компонент React",
        "Метод жизненного цикла",
        "Пропс компонента",
      ]),
      correctAnswer: 0,
      explanation:
        "useState - это хук для управления состоянием функционального компонента",
      difficulty: Difficulty.EASY,
      categoryId: reactCategory.id,
      subcategoryId: hooksSubcategory.id,
    },
    {
      question: "Когда выполняется useEffect?",
      options: JSON.stringify([
        "После каждого рендера",
        "Только при монтировании",
        "Только при размонтировании",
        "Зависит от массива зависимостей",
      ]),
      correctAnswer: 3,
      explanation:
        "useEffect выполняется после каждого рендера, но можно контролировать это с помощью массива зависимостей",
      difficulty: Difficulty.MEDIUM,
      categoryId: reactCategory.id,
      subcategoryId: hooksSubcategory.id,
    },
    {
      question: "Что возвращает useContext?",
      options: JSON.stringify([
        "Значение из ближайшего Provider",
        "Функцию для обновления контекста",
        "Массив всех значений контекста",
        "Объект с методами контекста",
      ]),
      correctAnswer: 0,
      explanation:
        "useContext возвращает значение из ближайшего Provider для данного контекста",
      difficulty: Difficulty.MEDIUM,
      categoryId: reactCategory.id,
      subcategoryId: hooksSubcategory.id,
    },
  ];

  // Создаем вопросы для React - Состояние
  const stateQuestions = [
    {
      question: "Как правильно обновить состояние, зависящее от предыдущего?",
      options: JSON.stringify([
        "setState(newValue)",
        "setState(prevState => newValue)",
        "state = newValue",
        "this.state = newValue",
      ]),
      correctAnswer: 1,
      explanation:
        "Для обновления состояния, зависящего от предыдущего, нужно использовать функцию-обновление",
      difficulty: Difficulty.MEDIUM,
      categoryId: reactCategory.id,
      subcategoryId: stateSubcategory.id,
    },
    {
      question: "Что произойдет, если вызвать setState несколько раз подряд?",
      options: JSON.stringify([
        "Каждый вызов обновит состояние",
        "React объединит обновления в один",
        "Произойдет ошибка",
        "Состояние не изменится",
      ]),
      correctAnswer: 1,
      explanation:
        "React объединяет множественные вызовы setState в один для оптимизации производительности",
      difficulty: Difficulty.HARD,
      categoryId: reactCategory.id,
      subcategoryId: stateSubcategory.id,
    },
  ];

  // Создаем вопросы для HTML
  const htmlQuestions = [
    {
      question: "Какой тег используется для создания заголовка первого уровня?",
      options: JSON.stringify(["<h1>", "<header>", "<title>", "<head>"]),
      correctAnswer: 0,
      explanation:
        "Тег <h1> используется для создания заголовка первого уровня",
      difficulty: Difficulty.EASY,
      categoryId: htmlCategory.id,
    },
    {
      question: "Что такое семантические теги?",
      options: JSON.stringify([
        "Теги с особым стилем",
        "Теги, которые описывают смысл содержимого",
        "Теги для JavaScript",
        "Теги для CSS",
      ]),
      correctAnswer: 1,
      explanation:
        "Семантические теги описывают смысл содержимого, а не его внешний вид",
      difficulty: Difficulty.MEDIUM,
      categoryId: htmlCategory.id,
    },
  ];

  // Создаем вопросы для CSS
  const cssQuestions = [
    {
      question: "Что такое CSS Grid?",
      options: JSON.stringify([
        "Система для создания сеток",
        "Метод позиционирования",
        "Способ анимации",
        "Техника для работы с цветами",
      ]),
      correctAnswer: 0,
      explanation: "CSS Grid - это система для создания двумерных сеток в CSS",
      difficulty: Difficulty.MEDIUM,
      categoryId: cssCategory.id,
    },
    {
      question: "Что такое flexbox?",
      options: JSON.stringify([
        "Одномерная система раскладки",
        "Двумерная система раскладки",
        "Система для анимаций",
        "Метод для работы с шрифтами",
      ]),
      correctAnswer: 0,
      explanation:
        "Flexbox - это одномерная система раскладки для создания гибких интерфейсов",
      difficulty: Difficulty.MEDIUM,
      categoryId: cssCategory.id,
    },
  ];

  // Создаем вопросы для HTTP/HTTPS
  const httpQuestions = [
    {
      question: "В чем разница между HTTP и HTTPS?",
      options: JSON.stringify([
        "HTTPS использует шифрование",
        "HTTP быстрее",
        "HTTPS только для мобильных",
        "Нет разницы",
      ]),
      correctAnswer: 0,
      explanation:
        "HTTPS использует SSL/TLS шифрование для безопасной передачи данных",
      difficulty: Difficulty.EASY,
      categoryId: httpCategory.id,
    },
    {
      question: "Что такое REST API?",
      options: JSON.stringify([
        "Архитектурный стиль для веб-сервисов",
        "Язык программирования",
        "База данных",
        "Фреймворк",
      ]),
      correctAnswer: 0,
      explanation: "REST - это архитектурный стиль для создания веб-сервисов",
      difficulty: Difficulty.MEDIUM,
      categoryId: httpCategory.id,
    },
  ];

  // Создаем вопросы для Браузера
  const browserQuestions = [
    {
      question: "Что такое DOM?",
      options: JSON.stringify([
        "Объектная модель документа",
        "Язык программирования",
        "База данных",
        "Сервер",
      ]),
      correctAnswer: 0,
      explanation:
        "DOM - это объектная модель документа, представление HTML в виде дерева объектов",
      difficulty: Difficulty.EASY,
      categoryId: browserCategory.id,
    },
    {
      question: "Что такое CORS?",
      options: JSON.stringify([
        "Механизм безопасности браузера",
        "Язык программирования",
        "База данных",
        "Фреймворк",
      ]),
      correctAnswer: 0,
      explanation:
        "CORS - это механизм безопасности браузера для контроля доступа к ресурсам",
      difficulty: Difficulty.HARD,
      categoryId: browserCategory.id,
    },
  ];

  // Создаем вопросы для мок-собеседования
  const mockInterviewQuestions = [
    // Junior вопросы
    {
      question: "Что такое HTTP?",
      options: JSON.stringify([
        "Протокол передачи гипертекста",
        "Язык программирования",
        "База данных",
        "Фреймворк",
      ]),
      correctAnswer: 0,
      explanation:
        "HTTP (HyperText Transfer Protocol) - это протокол для передачи данных в интернете",
      difficulty: Difficulty.EASY,
      interviewLevel: InterviewLevel.JUNIOR,
      categoryId: httpCategory.id,
    },
    {
      question: "Что такое DOM?",
      options: JSON.stringify([
        "Объектная модель документа",
        "Язык программирования",
        "База данных",
        "Сервер",
      ]),
      correctAnswer: 0,
      explanation:
        "DOM - это объектная модель документа, представление HTML в виде дерева объектов",
      difficulty: Difficulty.EASY,
      interviewLevel: InterviewLevel.JUNIOR,
      categoryId: browserCategory.id,
    },
    {
      question: "Что такое useState в React?",
      options: JSON.stringify([
        "Хук для управления состоянием компонента",
        "Компонент React",
        "Метод жизненного цикла",
        "Пропс компонента",
      ]),
      correctAnswer: 0,
      explanation:
        "useState - это хук для управления состоянием функционального компонента",
      difficulty: Difficulty.EASY,
      interviewLevel: InterviewLevel.JUNIOR,
      categoryId: reactCategory.id,
    },
    // Middle вопросы
    {
      question: "Что такое CORS?",
      options: JSON.stringify([
        "Механизм безопасности браузера",
        "Язык программирования",
        "База данных",
        "Фреймворк",
      ]),
      correctAnswer: 0,
      explanation:
        "CORS - это механизм безопасности браузера для контроля доступа к ресурсам",
      difficulty: Difficulty.MEDIUM,
      interviewLevel: InterviewLevel.MIDDLE,
      categoryId: browserCategory.id,
    },
    {
      question: "Когда выполняется useEffect?",
      options: JSON.stringify([
        "После каждого рендера",
        "Только при монтировании",
        "Только при размонтировании",
        "Зависит от массива зависимостей",
      ]),
      correctAnswer: 3,
      explanation:
        "useEffect выполняется после каждого рендера, но можно контролировать это с помощью массива зависимостей",
      difficulty: Difficulty.MEDIUM,
      interviewLevel: InterviewLevel.MIDDLE,
      categoryId: reactCategory.id,
    },
    // Senior вопросы
    {
      question: "Где нужно использовать useMemo?",
      options: JSON.stringify([
        "Для оптимизации дорогих вычислений",
        "Для управления состоянием",
        "Для обработки событий",
        "Для создания компонентов",
      ]),
      correctAnswer: 0,
      explanation:
        "useMemo используется для мемоизации дорогих вычислений и предотвращения ненужных пересчетов",
      difficulty: Difficulty.HARD,
      interviewLevel: InterviewLevel.SENIOR,
      categoryId: reactCategory.id,
    },
    {
      question: "Что такое React.memo?",
      options: JSON.stringify([
        "HOC для мемоизации компонентов",
        "Хук для состояния",
        "Метод жизненного цикла",
        "Пропс компонента",
      ]),
      correctAnswer: 0,
      explanation:
        "React.memo - это HOC (Higher-Order Component) для мемоизации компонентов и предотвращения ненужных рендеров",
      difficulty: Difficulty.HARD,
      interviewLevel: InterviewLevel.SENIOR,
      categoryId: reactCategory.id,
    },
  ];

  // Создаем все вопросы
  const allQuestions = [
    ...hooksQuestions,
    ...stateQuestions,
    ...htmlQuestions,
    ...cssQuestions,
    ...httpQuestions,
    ...browserQuestions,
    ...mockInterviewQuestions,
  ];

  for (const questionData of allQuestions) {
    await prisma.question.create({
      data: questionData,
    });
  }

  console.log("✅ Вопросы созданы");
  console.log(`📊 Создано ${allQuestions.length} вопросов`);

  // Создаем категории для изучения по темам
  const reactStudyCategory = await prisma.category.upsert({
    where: { name: "React (Изучение)" },
    update: {},
    create: {
      name: "React (Изучение)",
      description: "Подробное изучение React",
      icon: "⚛️",
      programId: topicStudyProgram.id,
      order: 1,
    },
  });

  const javascriptCategory = await prisma.category.upsert({
    where: { name: "JavaScript" },
    update: {},
    create: {
      name: "JavaScript",
      description: "Язык программирования JavaScript",
      icon: "🟨",
      programId: topicStudyProgram.id,
      order: 2,
    },
  });

  // Создаем вопросы для изучения по темам
  const reactStudyQuestions = [
    {
      question: "Что такое JSX в React?",
      options: JSON.stringify([
        "Синтаксическое расширение JavaScript",
        "Отдельный язык программирования",
        "Библиотека для стилизации",
        "Фреймворк для тестирования",
      ]),
      correctAnswer: 0,
      explanation:
        "JSX - это синтаксическое расширение JavaScript, которое позволяет писать HTML-подобный код в JavaScript",
      difficulty: Difficulty.EASY,
      categoryId: reactStudyCategory.id,
    },
    {
      question: "Что такое Virtual DOM?",
      options: JSON.stringify([
        "Легковесная копия реального DOM",
        "Отдельная база данных",
        "Серверный компонент",
        "Библиотека для анимаций",
      ]),
      correctAnswer: 0,
      explanation:
        "Virtual DOM - это легковесная копия реального DOM, которая используется для оптимизации обновлений",
      difficulty: Difficulty.MEDIUM,
      categoryId: reactStudyCategory.id,
    },
  ];

  const javascriptQuestions = [
    {
      question: "Что такое замыкание в JavaScript?",
      options: JSON.stringify([
        "Функция, которая имеет доступ к переменным внешней области видимости",
        "Способ закрытия программы",
        "Метод для работы с DOM",
        "Тип данных",
      ]),
      correctAnswer: 0,
      explanation:
        "Замыкание - это функция, которая имеет доступ к переменным внешней области видимости даже после завершения выполнения внешней функции",
      difficulty: Difficulty.MEDIUM,
      categoryId: javascriptCategory.id,
    },
    {
      question: "Что такое hoisting в JavaScript?",
      options: JSON.stringify([
        "Поднятие объявлений переменных и функций в начало области видимости",
        "Способ поднятия элементов на странице",
        "Метод для работы с массивами",
        "Техника оптимизации кода",
      ]),
      correctAnswer: 0,
      explanation:
        "Hoisting - это поведение JavaScript, при котором объявления переменных и функций поднимаются в начало их области видимости",
      difficulty: Difficulty.MEDIUM,
      categoryId: javascriptCategory.id,
    },
  ];

  // Добавляем вопросы для изучения по темам
  const studyQuestions = [...reactStudyQuestions, ...javascriptQuestions];

  for (const questionData of studyQuestions) {
    await prisma.question.create({
      data: questionData,
    });
  }

  console.log("✅ Дополнительные категории созданы");
  console.log(
    `📊 Создано ${studyQuestions.length} вопросов для изучения по темам`
  );

  console.log("🎉 База данных успешно заполнена!");
}

main()
  .catch((e) => {
    console.error("❌ Ошибка при заполнении базы данных:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });