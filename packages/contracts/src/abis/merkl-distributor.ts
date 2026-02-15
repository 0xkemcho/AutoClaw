export const merklDistributorAbi = [
  {
    name: 'claim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'users', type: 'address[]' },
      { name: 'tokens', type: 'address[]' },
      { name: 'amounts', type: 'uint256[]' },
      { name: 'proofs', type: 'bytes32[][]' },
    ],
    outputs: [],
  },
  {
    name: 'claimed',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '', type: 'address' },
      { name: '', type: 'address' },
    ],
    outputs: [
      { name: 'amount', type: 'uint208' },
      { name: 'timestamp', type: 'uint48' },
      { name: 'merkleRoot', type: 'bytes32' },
    ],
  },
] as const;
