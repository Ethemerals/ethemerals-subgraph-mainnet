import { Address, BigInt, BigDecimal, log, ethereum, json } from '@graphprotocol/graph-ts';

import { ADDRESS_ZERO, ZERO_BI, ZERO_BD, ONE_BI, TEN_BI, INI_SCORE, INI_ALLOWDELEGATES, CORE_ADDRESS, coreContract } from './constants';

import { getMintPrice, getMaxAvailableIndex, getEthemeralSupply } from './contractCallsCore';
import { getBalanceOf } from './contractCallsELF';
import {
	metaMainclass,
	metaSubclass,
	metaCoinName,
	metaSpecial2,
	metaArtist,
	metaColors,
	metaPets,
	metaPetStats,
	metaIdToItem,
	metaItems,
	metaItemsStats,
	metaCostumes,
} from '../metadata/metadataStats';

import { meralTraits } from '../metadata/meralTraits';

import { tokenToRanks } from '../metadata/tokenToRanks';

import {
	CoreAction,
	AccountAction,
	Transaction,
	Account,
	Core,
	Ethemeral,
	EthemeralAction,
	Metadata,
	Delegate,
	DelegateAction,
	Scorecard,
	Pet,
	PetMetadata,
	PetAction,
	Item,
	ItemMetadata,
	ItemAction,
} from '../../generated/schema';

export function ensureCore(event: ethereum.Event): Core {
	let core = Core.load(CORE_ADDRESS) as Core;
	if (core) {
		return core;
	}

	core = new Core(CORE_ADDRESS);
	core.timestamp = event.block.timestamp;
	core.blockNumber = event.block.number;
	core.owner = Address.fromString(ADDRESS_ZERO);
	core.mintPrice = getMintPrice();
	core.maxAvailableIndex = getMaxAvailableIndex();
	core.ethemeralSupply = getEthemeralSupply();

	core.save();

	return core;
}

export function ensureDelegate(event: ethereum.Event, id: string): Delegate {
	let delegate = Delegate.load(id) as Delegate;
	if (delegate) {
		return delegate;
	}

	delegate = new Delegate(id);
	delegate.timestamp = event.block.timestamp;
	delegate.blockNumber = event.block.number;
	delegate.active = true;
	delegate.save();

	return delegate;
}

export function ensureAccount(event: ethereum.Event, id: string): Account {
	let account = Account.load(id) as Account;
	if (account) {
		return account;
	}

	account = new Account(id);
	account.elfBalance = ZERO_BI;
	account.timestamp = event.block.timestamp;
	account.blockNumber = event.block.number;
	account.allowDelegates = INI_ALLOWDELEGATES;
	account.save();

	return account;
}

export function ensureEthemeral(event: ethereum.Event, tokenId: BigInt): Ethemeral {
	let id = tokenId.toString();
	let ethemeral = Ethemeral.load(id) as Ethemeral;
	if (ethemeral) {
		return ethemeral;
	}

	let rankData = tokenToRanks[tokenId.toI32()]; // random rank
	ethemeral = new Ethemeral(id);
	ethemeral.timestamp = event.block.timestamp;
	ethemeral.blockNumber = event.block.number;
	ethemeral.creator = CORE_ADDRESS;
	ethemeral.owner = CORE_ADDRESS;
	ethemeral.previousOwner = CORE_ADDRESS;
	ethemeral.score = INI_SCORE;
	ethemeral.rewards = ZERO_BI;
	ethemeral.atk = ZERO_BI;
	ethemeral.def = ZERO_BI;
	ethemeral.spd = ZERO_BI;
	ethemeral.atkBonus = ZERO_BI;
	ethemeral.defBonus = ZERO_BI;
	ethemeral.spdBonus = ZERO_BI;
	ethemeral.baseId = BigInt.fromI32(rankData[0]);
	ethemeral.bgId = BigInt.fromI32(rankData[1]);
	ethemeral.petRedeemed = false;
	ethemeral.scorecard = ensureScorecard(ethemeral.id).id;
	ethemeral.metadata = ensureMetadata(BigInt.fromI32(rankData[0])).id;
	ethemeral.save();

	return ethemeral;
}

export function ensureScorecard(tokenId: string): Scorecard {
	let scorecard = Scorecard.load(tokenId) as Scorecard;
	if (scorecard) {
		return scorecard;
	}

	scorecard = new Scorecard(tokenId);
	scorecard.ethemeral = tokenId;
	scorecard.highestScore = INI_SCORE;
	scorecard.highestRewards = ZERO_BI; // TODO
	scorecard.battles = ZERO_BI;
	scorecard.wins = ZERO_BI;
	scorecard.revived = ZERO_BI;
	scorecard.reviver = ZERO_BI;
	scorecard.resurrected = ZERO_BI;
	scorecard.reaped = ZERO_BI;
	scorecard.reaper = ZERO_BI;
	scorecard.drained = ZERO_BI;

	scorecard.save();

	return scorecard;
}

export function ensureMetadata(rank: BigInt): Metadata {
	let rankIndex = rank.toI32();
	let metadata = meralTraits[rankIndex];
	let id = metadata[0];

	let meta = Metadata.load(id.toString()) as Metadata;
	if (meta) {
		return meta;
	}

	// [cmId, mainClass, subclass, special1, hair, eyes, skin]
	meta = new Metadata(id.toString());
	meta.editionCount = ZERO_BI;
	meta.coin = metaCoinName[rankIndex];
	meta.artist = metaArtist[rankIndex];
	meta.mainClass = metaMainclass[metadata[1]];
	meta.subClass = metaSubclass[metadata[1]][metadata[2]];
	meta.special1 = metadata[3];
	meta.special2 = metaSpecial2[rankIndex];
	meta.hair = metaColors[metadata[4]];
	meta.eyes = metaColors[metadata[5]];
	meta.skin = metaColors[metadata[6]];
	meta.costume = metaCostumes[metadata[7]];

	meta.save();

	return meta;
}

export function ensureCoreAction(event: ethereum.Event): CoreAction {
	let id = transactionId(event.transaction);
	let action = CoreAction.load(id) as CoreAction;
	if (action) {
		return action;
	}

	action = new CoreAction(id);
	action.timestamp = event.block.timestamp;
	action.transaction = ensureTransaction(event).id;
	action.type = 'Default';
	action.save();

	return action;
}

export function ensureDelegateAction(event: ethereum.Event, delegateId: string): DelegateAction {
	let id = transactionId(event.transaction);
	let action = DelegateAction.load(id) as DelegateAction;
	if (action) {
		return action;
	}

	action = new DelegateAction(id);
	action.delegate = delegateId;
	action.timestamp = event.block.timestamp;
	action.transaction = ensureTransaction(event).id;
	action.type = 'Default';
	action.save();

	return action;
}

export function ensureEthemeralAction(event: ethereum.Event, tokenId: string): EthemeralAction {
	let id = transactionId(event.transaction) + '/' + tokenId;
	let action = EthemeralAction.load(id) as EthemeralAction;
	if (action) {
		return action;
	}

	action = new EthemeralAction(id);
	action.ethemeral = tokenId;
	action.timestamp = event.block.timestamp;
	action.transaction = ensureTransaction(event).id;
	action.staked = false;
	action.type = 'Default';
	action.save();

	return action;
}

export function ensureAccountAction(event: ethereum.Event, accountId: string): AccountAction {
	let id = transactionId(event.transaction) + '/' + accountId;
	let action = AccountAction.load(id) as AccountAction;
	if (action) {
		return action;
	}

	action = new AccountAction(id);
	action.account = accountId;
	action.timestamp = event.block.timestamp;
	action.transaction = ensureTransaction(event).id;
	action.type = 'Default';
	action.save();

	return action;
}

export function ensureTransaction(event: ethereum.Event): Transaction {
	let id = transactionId(event.transaction);
	let transaction = Transaction.load(id) as Transaction;
	if (transaction) {
		return transaction;
	}

	transaction = new Transaction(id);
	transaction.from = event.transaction.from;
	transaction.to = event.transaction.to ? event.transaction.to : null;
	transaction.value = event.transaction.value;
	transaction.block = event.block.number;
	transaction.timestamp = event.block.timestamp;
	transaction.gasUsed = event.transaction.gasUsed.toI32();
	transaction.gasPrice = event.transaction.gasPrice;
	transaction.save();

	return transaction;
}

export function transactionId(tx: ethereum.Transaction): string {
	return tx.hash.toHex();
}

export function ensurePet(event: ethereum.Event, tokenId: BigInt): Pet {
	let id = tokenId.toString();
	let pet = Pet.load(id) as Pet;
	if (pet) {
		return pet;
	}

	let rankData = tokenToRanks[tokenId.toI32()]; // random rank
	pet = new Pet(id);
	pet.timestamp = event.block.timestamp;
	pet.blockNumber = event.block.number;
	pet.creator = CORE_ADDRESS;
	pet.owner = CORE_ADDRESS;
	pet.previousOwner = CORE_ADDRESS;
	pet.baseId = BigInt.fromI32(rankData[2]);

	// GET METADATA
	pet.metadata = ensurePetMetadata(pet.baseId).id;

	// GET STATS
	pet.atk = BigInt.fromI32(metaPetStats[pet.baseId.toI32()][0]);
	pet.def = BigInt.fromI32(metaPetStats[pet.baseId.toI32()][1]);
	pet.spd = BigInt.fromI32(metaPetStats[pet.baseId.toI32()][2]);
	pet.rarity = BigInt.fromI32(metaPetStats[pet.baseId.toI32()][3]);

	pet.save();

	return pet;
}

export function ensurePetMetadata(type: BigInt): PetMetadata {
	let meta = PetMetadata.load(type.toString()) as PetMetadata;
	if (meta) {
		return meta;
	}

	meta = new PetMetadata(type.toString());
	let typeIndex = type.toI32();
	// 33 === doge 0-31 === slimes 32 === the egg
	meta.name = metaPets[typeIndex];
	meta.editionCount = ZERO_BI;

	meta.save();

	return meta;
}

export function ensurePetAction(event: ethereum.Event, tokenId: string): PetAction {
	let id = transactionId(event.transaction) + '/' + tokenId;
	let action = PetAction.load(id) as PetAction;
	if (action) {
		return action;
	}

	action = new PetAction(id);
	action.pet = tokenId;
	action.timestamp = event.block.timestamp;
	action.transaction = ensureTransaction(event).id;
	action.type = 'Default';
	action.save();

	return action;
}

export function ensureItem(event: ethereum.Event, tokenId: BigInt): Item {
	let id = tokenId.toString();

	let item = Item.load(id) as Item;
	if (item) {
		return item;
	}

	let itemID = tokenId.minus(BigInt.fromI32(10001)); // reset to 0

	let idToItem = metaIdToItem[itemID.toI32()]; // random item
	item = new Item(id);
	item.timestamp = event.block.timestamp;
	item.blockNumber = event.block.number;
	item.creator = CORE_ADDRESS;
	item.owner = CORE_ADDRESS;
	item.previousOwner = CORE_ADDRESS;
	item.baseId = BigInt.fromI32(idToItem);

	// GET METADATA
	item.metadata = ensureItemMetadata(item.baseId).id;

	// GET STATS
	item.atk = BigInt.fromI32(metaItemsStats[item.baseId.toI32()][0]);
	item.def = BigInt.fromI32(metaItemsStats[item.baseId.toI32()][1]);
	item.spd = BigInt.fromI32(metaItemsStats[item.baseId.toI32()][2]);
	item.rarity = BigInt.fromI32(metaItemsStats[item.baseId.toI32()][3]);

	item.save();

	return item;
}

export function ensureItemMetadata(type: BigInt): ItemMetadata {
	let meta = ItemMetadata.load(type.toString()) as ItemMetadata;
	if (meta) {
		return meta;
	}

	meta = new ItemMetadata(type.toString());
	let typeIndex = type.toI32();
	meta.name = metaItems[typeIndex];
	meta.editionCount = ZERO_BI;
	meta.save();

	return meta;
}

export function ensureItemAction(event: ethereum.Event, tokenId: string): ItemAction {
	let id = transactionId(event.transaction) + '/' + tokenId;
	let action = ItemAction.load(id) as ItemAction;
	if (action) {
		return action;
	}

	action = new ItemAction(id);
	action.item = tokenId;
	action.timestamp = event.block.timestamp;
	action.transaction = ensureTransaction(event).id;
	action.type = 'Default';
	action.save();

	return action;
}
