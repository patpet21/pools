import { ethers } from 'ethers';

// Contract Addresses
const MARKETPLACE_ADDRESS = '0x54a898F830cA5d103F184939004AD5F9241CAaB7'; // Nuovo indirizzo del contratto
const PRDX_TOKEN_ADDRESS = '0x61Dd008F1582631Aa68645fF92a1a5ECAedBeD19';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const TOKEN_CREATOR_ADDRESS = '0x01A3ad1acc738cb60d48E08ccadC769904De256c';
const FEE_RECIPIENT = '0x7fDECF16574bd21Fd5cce60B701D01A6F83826ab';

// ABIs
const MARKETPLACE_ABI = [
  "function listToken(address tokenAddress, uint256 amountHuman, uint256 pricePerShareHuman, address paymentToken, bool referralActive, uint256 referralPercent, (string projectWebsite, string socialMediaLink, string tokenImageUrl, string telegramUrl, string projectDescription) metadata, uint256 durationInSeconds) external",
  "function buyToken(uint256 listingId, uint256 amountHuman, bytes32 referralCode) external",
  "function cancelListing(uint256 listingId) external",
  "function listingCount() external view returns (uint256)",
  "function getListingMainDetails(uint256 listingId) external view returns (address seller, address tokenAddress, uint256 amount, uint256 pricePerShare, address paymentToken, bool active, bool referralActive, uint256 referralPercent, bytes32 referralCode, uint256 endTime)",
  "function getListingMetadata(uint256 listingId) external view returns (string projectWebsite, string socialMediaLink, string tokenImageUrl, string telegramUrl, string projectDescription)",
  "function generateBuyerReferralCode(uint256 listingId) external returns (bytes32)"
];

const TOKEN_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function totalSupply() external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)"
];

const TOKEN_CREATOR_ABI = [
  "function getTokenDetails(address tokenAddress) external view returns (address, string memory, string memory, uint256, address, string memory, string memory, string memory, string memory)"
];

export async function listPropertyToken(
  tokenAddress: string,
  amount: string,            // Valore umano (es. "500")
  pricePerShare: string,     // Valore umano (es. "10")
  useUSDC: boolean,
  projectWebsite: string,
  socialMediaLink: string,
  imageUrl: string,
  telegramUrl: string,
  projectDescription: string,
  signer: ethers.Signer,
  useReferral: boolean = false,
  referralPercent: number = 0,
  durationInSeconds: number = 604800
) {
  try {
    if (!ethers.isAddress(tokenAddress)) throw new Error('Invalid token address');
    if (tokenAddress.toLowerCase() === PRDX_TOKEN_ADDRESS.toLowerCase()) throw new Error('Cannot list PRDX token');

    const token = new ethers.Contract(tokenAddress, TOKEN_ABI, signer);
    const tokenDecimals = await token.decimals();
    const amountRaw = ethers.parseUnits(amount, tokenDecimals); // Converti solo per il trasferimento

    const paymentTokenAddress = useUSDC ? USDC_ADDRESS : PRDX_TOKEN_ADDRESS;
    const paymentToken = new ethers.Contract(paymentTokenAddress, TOKEN_ABI, signer);
    const paymentDecimals = await paymentToken.decimals();

    const userAddress = await signer.getAddress();
    const balance = await token.balanceOf(userAddress);
    if (balance < amountRaw) throw new Error('Insufficient token balance');

    const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
    const allowance = await token.allowance(userAddress, MARKETPLACE_ADDRESS);

    if (allowance < amountRaw) {
      console.log('Approving Marketplace...');
      const approveTx = await token.approve(MARKETPLACE_ADDRESS, ethers.MaxUint256);
      await approveTx.wait();
      console.log('Marketplace approval confirmed');
    }

    console.log('Listing token...');
    const metadata = {
      projectWebsite: projectWebsite || '',
      socialMediaLink: socialMediaLink || '',
      tokenImageUrl: imageUrl || '',
      telegramUrl: telegramUrl || '',
      projectDescription: projectDescription || ''
    };
    const tx = await marketplace.listToken(
      tokenAddress,
      amount, // Valore umano
      pricePerShare, // Valore umano
      paymentTokenAddress,
      useReferral,
      referralPercent,
      metadata,
      durationInSeconds
    );
    const receipt = await tx.wait();
    console.log('Listing confirmed:', receipt.hash);
    return receipt;
  } catch (error: any) {
    console.error('Detailed error in listPropertyToken:', {
      message: error.message,
      reason: error.reason,
      data: error.data,
      code: error.code
    });
    throw new Error(`Failed to list token: ${error.message}${error.reason ? ` - ${error.reason}` : ''}`);
  }
}

export async function connectWallet() {
  if (!window.ethereum) throw new Error('MetaMask is not installed');
  try {
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return signer;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function getWalletBalances(signer: ethers.Signer) {
  try {
    const userAddress = await signer.getAddress();
    const provider = signer.provider;
    if (!provider) throw new Error('No provider attached to signer');

    const [ethBalance, prdxToken, usdcToken] = await Promise.all([
      provider.getBalance(userAddress),
      new ethers.Contract(PRDX_TOKEN_ADDRESS, TOKEN_ABI, signer),
      new ethers.Contract(USDC_ADDRESS, TOKEN_ABI, signer)
    ]);

    const [prdxBalance, usdcBalance, prdxDecimals, usdcDecimals] = await Promise.all([
      prdxToken.balanceOf(userAddress),
      usdcToken.balanceOf(userAddress),
      prdxToken.decimals(),
      usdcToken.decimals()
    ]);

    return {
      eth: parseFloat(ethers.formatEther(ethBalance)).toFixed(6),
      prdx: parseFloat(ethers.formatUnits(prdxBalance, prdxDecimals)).toFixed(6),
      usdc: parseFloat(ethers.formatUnits(usdcBalance, usdcDecimals)).toFixed(6)
    };
  } catch (error: any) {
    console.error('Error getting wallet balances:', error);
    throw new Error(`Failed to get wallet balances: ${error.message}`);
  }
}

export async function getListings(signer: ethers.Signer) {
  try {
    const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
    const listingCount = await marketplace.listingCount();
    console.log(`Total listings count: ${listingCount.toString()}`);
    const listings = [];
    const userAddress = await signer.getAddress();

    for (let i = 0; i < Number(listingCount); i++) {
      try {
        const [mainDetails, metadata] = await Promise.all([
          marketplace.getListingMainDetails(i),
          marketplace.getListingMetadata(i)
        ]);

        const token = new ethers.Contract(mainDetails.tokenAddress, TOKEN_ABI, signer);
        const [name, symbol] = await Promise.all([
          token.name(),
          token.symbol()
        ]);

        const paymentToken = new ethers.Contract(mainDetails.paymentToken, TOKEN_ABI, signer);
        const paymentTokenSymbol = await paymentToken.symbol();

        listings.push({
          id: i,
          seller: mainDetails.seller,
          token: {
            address: mainDetails.tokenAddress,
            name,
            symbol,
            amount: mainDetails.amount.toString(), // Valore umano
            pricePerShare: mainDetails.pricePerShare.toString() // Valore umano
          },
          paymentToken: mainDetails.paymentToken,
          paymentTokenSymbol,
          active: mainDetails.active,
          isOwner: mainDetails.seller.toLowerCase() === userAddress.toLowerCase(),
          projectWebsite: metadata.projectWebsite,
          socialMediaLink: metadata.socialMediaLink,
          imageUrl: metadata.tokenImageUrl,
          websiteUrl: metadata.projectWebsite,
          twitterUrl: metadata.socialMediaLink,
          telegramUrl: metadata.telegramUrl,
          projectDescription: metadata.projectDescription,
          referralActive: mainDetails.referralActive,
          referralPercent: Number(mainDetails.referralPercent),
          referralCode: mainDetails.referralCode,
          endTime: Number(mainDetails.endTime)
        });
      } catch (error) {
        console.error(`Error processing listing ${i}:`, error);
      }
    }

    console.log('Returned listings:', listings);
    return listings;
  } catch (error: any) {
    console.error('Error getting listings:', error);
    throw new Error(`Failed to get listings: ${error.message}`);
  }
}

export async function buyTokens(
  listingId: number,
  amount: string,  // Valore umano (es. "200")
  signer: ethers.Signer,
  referralCode?: string
) {
  try {
    const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
    const mainDetails = await marketplace.getListingMainDetails(listingId);

    const paymentToken = new ethers.Contract(mainDetails.paymentToken, TOKEN_ABI, signer);
    const paymentDecimals = await paymentToken.decimals();
    const totalCostRaw = ethers.parseUnits(
      (parseFloat(amount) * parseFloat(mainDetails.pricePerShare)).toString(),
      paymentDecimals
    );

    const userAddress = await signer.getAddress();
    const paymentBalance = await paymentToken.balanceOf(userAddress);
    if (paymentBalance < totalCostRaw) throw new Error('Insufficient payment token balance');

    const allowance = await paymentToken.allowance(userAddress, MARKETPLACE_ADDRESS);
    if (allowance < totalCostRaw) {
      console.log('Approving payment token...');
      const approveTx = await paymentToken.approve(MARKETPLACE_ADDRESS, ethers.MaxUint256);
      await approveTx.wait();
      console.log('Payment token approval confirmed');
    }

    const defaultReferralCode = ethers.encodeBytes32String('default_to_fee_recipient');
    const referralCodeBytes32 = referralCode
      ? ethers.encodeBytes32String(referralCode)
      : defaultReferralCode;

    console.log('Executing buyToken...');
    const tx = await marketplace.buyToken(listingId, amount, referralCodeBytes32); // Valore umano
    const receipt = await tx.wait();
    console.log('Purchase confirmed:', receipt.hash);
    return receipt;
  } catch (error: any) {
    console.error('Detailed error in buyTokens:', {
      message: error.message,
      reason: error.reason,
      data: error.data,
      code: error.code,
      transaction: error.transaction
    });
    throw new Error(`Failed to buy tokens: ${error.message}${error.reason ? ` - ${error.reason}` : ''}`);
  }
}

export async function cancelListing(listingId: number, signer: ethers.Signer) {
  try {
    const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
    const tx = await marketplace.cancelListing(listingId);
    return await tx.wait();
  } catch (error: any) {
    throw new Error(`Failed to cancel listing: ${error.message}`);
  }
}

export async function getReferralCode(listingId: number, signer: ethers.Signer): Promise<string> {
  try {
    const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
    const mainDetails = await marketplace.getListingMainDetails(listingId);
    return mainDetails.referralCode;
  } catch (error: any) {
    console.error('Error getting referral code:', error);
    return ethers.ZeroHash;
  }
}

export async function generateBuyerReferralCode(listingId: number, signer: ethers.Signer): Promise<string> {
  try {
    const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
    const tx = await marketplace.generateBuyerReferralCode(listingId);
    await tx.wait();
    const mainDetails = await marketplace.getListingMainDetails(listingId);
    return mainDetails.referralCode;
  } catch (error: any) {
    throw new Error(`Failed to generate buyer referral code: ${error.message}`);
  }
}