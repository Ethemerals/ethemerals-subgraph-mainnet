import { BigDecimal, BigInt } from '@graphprotocol/graph-ts';
import { EthemeralLifeForce as ELF, Approval, Transfer } from '../../generated/EthemeralLifeForce/EthemeralLifeForce';
import { addressId, transactionId } from '../utils/helpers';
// import { ensureCoreAction, ensureDelegateAction, ensureEthemeralAction, ensureAccountAction, ensureCore, ensureDelegate, ensureAccount, ensureEthemeral, ensureScorecard } from '../utils/ensures';
import { ensureAccountAction, ensureAccount } from '../utils/ensures';
import { Account } from '../../generated/schema';
import { ZERO_BD, ZERO_BI } from '../utils/constants';

export function handleApproval(event: Approval): void {
	// - contract.allowance(...)
	// - contract.approve(...)
	// - contract.balanceOf(...)
	// - contract.decimals(...)
	// - contract.decreaseAllowance(...)
	// - contract.increaseAllowance(...)
	// - contract.name(...)
	// - contract.symbol(...)
	// - contract.totalSupply(...)
	// - contract.transfer(...)
	// - contract.transferFrom(...)
}

export function handleTransfer(event: Transfer): void {
	let amount = event.params.value;

	// TO
	let accountTo = Account.load(addressId(event.params.to)) as Account;
	if (accountTo) {
		accountTo.elfBalance = accountTo.elfBalance.plus(amount);
	} else {
		accountTo = ensureAccount(event, addressId(event.params.to));
		accountTo.elfBalance = amount;
	}

	let accountToAction = ensureAccountAction(event, accountTo.id);
	accountToAction.type = 'ReceiveELF';

	// FROM
	let accountFrom = Account.load(addressId(event.params.from)) as Account;
	if (accountFrom) {
		if (amount >= accountFrom.elfBalance) {
			accountFrom.elfBalance = ZERO_BI;
		} else {
			accountFrom.elfBalance = accountFrom.elfBalance.minus(amount);
		}
	} else {
		accountFrom = ensureAccount(event, addressId(event.params.from));
	}

	let accountFromAction = ensureAccountAction(event, accountFrom.id);
	accountFromAction.type = 'SendELF';

	accountTo.save();
	accountToAction.save();

	accountFromAction.save();
	accountFrom.save();
}
