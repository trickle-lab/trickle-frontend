# Trickle Frontend

Web app for [Trickle](https://github.com/trickle-lab/trickle-contract), a Stellar streaming payments protocol. Connect a wallet, create a payment stream, and watch it vest in real time.

## What works today

- **Wallet connect** through [Stellar Wallets Kit](https://github.com/Creit-Tech/Stellar-Wallets-Kit) (Freighter and other Stellar wallets)
- **Create a stream**: builds, simulates, signs and submits a real `create_stream` transaction to the Soroban contract on testnet, then links to the transaction on stellar.expert
- **Streams dashboard**: one card per stream with status, vesting progress, withdrawn amount and amount available, refreshed every 10 seconds from [trickle-backend](https://github.com/trickle-lab/trickle-backend)

## Roadmap (good first issues)

- Withdraw button for recipients
- Cancel button for senders (needs a `cancel` event in the contract)
- Filter the dashboard to streams involving the connected wallet
- Choose a token other than native XLM

## Stack

Next.js 16, React 19, TypeScript, Tailwind CSS 4, `@stellar/stellar-sdk`, `@creit.tech/stellar-wallets-kit`

## Running locally

1. Run [trickle-backend](https://github.com/trickle-lab/trickle-backend) on port 4000
2. `npm install`
3. `cp .env.local.example .env.local` and fill in the values
4. `npm run dev`, then open http://localhost:3000

See [CONTRIBUTING.md](./CONTRIBUTING.md) for more.

## Part of Trickle

- [trickle-contract](https://github.com/trickle-lab/trickle-contract)
- [trickle-backend](https://github.com/trickle-lab/trickle-backend)
- [trickle-frontend](https://github.com/trickle-lab/trickle-frontend) (this repo)

## License

Apache License 2.0
