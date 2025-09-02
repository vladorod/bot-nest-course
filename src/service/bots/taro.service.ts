import { TARO_CARDS } from './taro.cards';

class TaroService {
  getRandomCards(){

    const randomNumbers = new Set<number>();

    while (randomNumbers.size < 3) {
      const randomNumber = Math.floor(Math.random() * TARO_CARDS.length);
      randomNumbers.add(randomNumber);
    }

    TARO_CARDS.forEach(card => card.inverted = !!Math.floor(Math.random() * 2));

    const [one, two, three] = Array.from<number>(randomNumbers)

    return [TARO_CARDS[one], TARO_CARDS[two], TARO_CARDS[three]] ;
  }

  getRandomCard(){

    const randomCard = TARO_CARDS[Math.floor(Math.random() * TARO_CARDS.length)];
    randomCard['inverted'] = !!Math.floor(Math.random() * 2);
    return randomCard
  }
}

export default new TaroService();