import Card from './Card.js';
import Game from './Game.js';
import TaskQueue from './TaskQueue.js';
import SpeedRate from './SpeedRate.js';

class Creature extends Card {
    constructor(name, maxPower, image) {
        super(name, maxPower, image);
        this._currentPower = maxPower;
    }

    get currentPower() {
        return this._currentPower;
    }

    set currentPower(value) {
        this._currentPower = Math.min(value, this.maxPower);
    }

    getDescriptions() {
        return [
            getCreatureDescription(this),
            ...super.getDescriptions()
        ];
    }
}

class Duck extends Creature {
    constructor(name = 'Мирная утка', power = 2) {
        super(name, power);
    }

    quacks() {
        console.log('quack');
    }

    swims() {
        console.log('float: both;');
    }
}

class Dog extends Creature {
    constructor(name = 'Пес-бандит', power = 3) {
        super(name, power);
    }
}

class Lad extends Dog {
    constructor() {
        super('Браток', 2);
    }

    static getInGameCount() {
        return this.inGameCount || 0;
    }

    static setInGameCount(value) {
        this.inGameCount = value;
    }

    static getBonus() {
        const count = this.getInGameCount();
        return count * (count + 1) / 2;
    }

    doAfterComingIntoPlay(gameContext, continuation) {
        Lad.setInGameCount(Lad.getInGameCount() + 1);
        super.doAfterComingIntoPlay(gameContext, continuation);
    }

    doBeforeRemoving(continuation) {
        Lad.setInGameCount(Lad.getInGameCount() - 1);
        super.doBeforeRemoving(continuation);
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        continuation(value + Lad.getBonus());
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        continuation(value - Lad.getBonus());
    }

    getDescriptions() {
        const descriptions = [...super.getDescriptions()];
        if (Lad.prototype.hasOwnProperty('modifyDealedDamageToCreature') || Lad.prototype.hasOwnProperty('modifyTakenDamage')) {
            descriptions.unshift('Чем их больше, тем они сильнее');
        }
        return descriptions;
    }
}

class Rogue extends Creature {
    constructor() {
        super('Изгой', 2);
    }

    doBeforeAttack(gameContext, continuation) {
        const {oppositePlayer, position, updateView} = gameContext;
        const targetCard = oppositePlayer.table[position];

        if (targetCard) {
            const targetProto = Object.getPrototypeOf(targetCard);
            const abilitiesToSteal = [
                'modifyDealedDamageToCreature',
                'modifyDealedDamageToPlayer',
                'modifyTakenDamage'
            ];

            abilitiesToSteal.forEach(ability => {
                if (targetProto.hasOwnProperty(ability)) {
                    this[ability] = targetProto[ability];
                    delete targetProto[ability];
                }
            });
        }
        updateView();
        continuation();
    }
}

class Brewer extends Duck {
    constructor() {
        super('Пивовар', 2);
    }

    doBeforeAttack(gameContext, continuation) {
        const {currentPlayer, oppositePlayer, updateView} = gameContext;
        const allCards = currentPlayer.table.concat(oppositePlayer.table);

        allCards.forEach(card => {
            if (isDuck(card)) {
                card.maxPower += 1;
                card.currentPower += 2;
                card.view.signalHeal();
                card.updateView();
            }
        });

        updateView();
        continuation();
    }
}

class PseudoDuck extends Dog {
    constructor() {
        super('Псевдоутка', 3);
    }

    quacks() {
        console.log('quack');
    }

    swims() {
        console.log('float: both;');
    }
}

class Nemo extends Creature {
    constructor() {
        super('Немо', 4);
    }

    doBeforeAttack(gameContext, continuation) {
        const {oppositePlayer, position, updateView} = gameContext;
        const targetCard = oppositePlayer.table[position];

        if (targetCard) {
            const targetProto = Object.getPrototypeOf(targetCard);
            Object.setPrototypeOf(this, targetProto);
            updateView();
            if (this.doBeforeAttack) {
                this.doBeforeAttack(gameContext, continuation);
                return;
            }
        }
        continuation();
    }
}

function isDuck(card) {
    return card && card.quacks && card.swims;
}

function isDog(card) {
    return card instanceof Dog;
}

function getCreatureDescription(card) {
    if (isDuck(card) && isDog(card)) {
        return 'Утка-Собака';
    }
    if (isDuck(card)) {
        return 'Утка';
    }
    if (isDog(card)) {
        return 'Собака';
    }
    return 'Существо';
}

class Trasher extends Dog {
    constructor() {
        super('Громила', 5);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => {
            continuation(value - 1);
        });
    }

    getDescriptions() {
        return [
            'Получает на 1 меньше урона',
            ...super.getDescriptions(),
        ];
    }
}

class Gatling extends Creature {
    constructor() {
        super('Гатлинг', 6);
    }

    attack(gameContext, continuation) {
        const taskQueue = new TaskQueue();
        const {oppositePlayer} = gameContext;

        for (const oppositeCard of oppositePlayer.table) {
            if (oppositeCard) {
                taskQueue.push(onDone => this.view.showAttack(onDone));
                taskQueue.push(onDone => {
                    this.dealDamageToCreature(2, oppositeCard, gameContext, onDone);
                });
            }
        }

        taskQueue.continueWith(continuation);
    }

    getDescriptions() {
        return [
            'Наносит всем картам противника 2 урона.',
            ...super.getDescriptions(),
        ];
    }
}

const seriffStartDeck = [
    new Duck(),
    new Brewer(),
    new Nemo(),
    new Duck(),
    new Gatling(),
    new Gatling()
];
const banditStartDeck = [
    new Dog(),
    new PseudoDuck(),
    new Dog(),
    new Gatling()
];

const game = new Game(seriffStartDeck, banditStartDeck);

SpeedRate.set(4);

game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});