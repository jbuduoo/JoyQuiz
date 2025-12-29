export const getQuestionData = (fileName: string) => {
  switch (fileName) {
    case 'sample.json':
      return require('../../assets/data/questions/sample.json');
    case 'A001.json':
      return require('../../assets/data/questions/A001.json');
    case 'A002.json':
      return require('../../assets/data/questions/A002.json');
    case 'A003.json':
      return require('../../assets/data/questions/A003.json');
    default:
      return [];
  }
};

