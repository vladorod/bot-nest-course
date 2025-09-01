import * as fs from 'fs';
import { Card } from '../../utils';

class TaroService {
  getRandomCards(){
    const cards = fs.readFileSync('./src/service/bots/taro.cards.json', 'utf-8');
    const jsonCards = JSON.parse(cards) as Card[];
    const randomNumbers = new Set<number>();

    while (randomNumbers.size < 3) {
      const randomNumber = Math.floor(Math.random() * jsonCards.length);
      randomNumbers.add(randomNumber);
    }

    jsonCards.forEach(card => card.inverted = !!Math.floor(Math.random() * 2));

    const [one, two, three] = Array.from<number>(randomNumbers)

    return [jsonCards[one], jsonCards[two], jsonCards[three]] ;
  }

  getRandomCard(){
    const cards = fs.readFileSync('./src/service/bots/taro.cards.json', 'utf-8');
    const jsonCards = JSON.parse(cards) as Card[];
    const randomCard = jsonCards[Math.floor(Math.random() * jsonCards.length)];
    randomCard.inverted = !!Math.floor(Math.random() * 2);
    return randomCard
  }
}

export default new TaroService();