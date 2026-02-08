export const biPoolManagerAbi = [
  {
    name: 'getExchanges',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'exchangeId', type: 'bytes32' },
          { name: 'assets', type: 'address[]' },
        ],
      },
    ],
  },
] as const;
