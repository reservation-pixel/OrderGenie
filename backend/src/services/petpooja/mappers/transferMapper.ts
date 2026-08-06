import type { PetpoojaTransfer } from '../transferApi.service';

export interface MappedTransferLeg {
  itemName: string;
  quantity: number;
  unit: string | null;
  transactionDate: Date;
  referenceId: string;
}

export function mapPetpoojaTransfer(transfer: PetpoojaTransfer): {
  outgoing: MappedTransferLeg[];
  incoming: MappedTransferLeg[];
  sourceRid: string;
  destinationRid: string;
} {
  const transactionDate = new Date(transfer.transfer_date);
  const legs = transfer.items.map((i) => ({
    itemName: i.item_name,
    quantity: i.quantity,
    unit: i.unit ?? null,
    transactionDate,
    referenceId: transfer.transfer_number,
  }));

  return {
    outgoing: legs,
    incoming: legs,
    sourceRid: transfer.source_rid,
    destinationRid: transfer.destination_rid,
  };
}
