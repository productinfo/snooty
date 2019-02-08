import React from 'react';
import Card from './Card';

const CATEGORIES = [
  {
    name:'Getting Started',
    iconSlug: 'getting-started',
  },
  {
    name: 'Use Case',
    iconSlug: 'use-case',
  },
  {
    name: 'Deep Dive',
    iconSlug: 'deep-dive',
  },
];

const LandingPageCards = ({ guides, refDocMapping }) => {
  console.log(refDocMapping)
  return CATEGORIES.map((category, index) => (
    <Category
      cards={guides.filter(card => {
        const cardName = card.name === 'card'
          ? card.argument[0].value
          : card.children[0].children[0].children[0].children[0].value;
          console.log(getGuideType(refDocMapping[cardName].ast))
        return category.name === getGuideType(refDocMapping[cardName].ast)
      })}
      category={category}
      refDocMapping={refDocMapping}
      key={index}
    />
  ));
}

const Category = ({ cards, category, refDocMapping }) => { 
  return cards.length > 0 && (
    <section className="guide-category" key={category.iconSlug}>
      <div className={`guide-category__title guide-category__title--${category.iconSlug}`}>
        { category.name }
      </div>
      <div className="guide-category__guides">
        {cards.map((card, index) => (
          <Card
            card={card}
            key={index}
            cardId={index}
            refDocMapping={refDocMapping}
          />
        ))}
      </div>
    </section>
  );
}

const getGuideType = (node) => {
    if (node.name === 'type') {
      return node.argument[0].value;
    }

    if (node.children) {
      for (let i in node.children) {
        let child = node.children[i];
        let result = getGuideType(child);

        if (result !== false) {
          return result;
        }
      }
    }

    return false;
}

export default LandingPageCards;