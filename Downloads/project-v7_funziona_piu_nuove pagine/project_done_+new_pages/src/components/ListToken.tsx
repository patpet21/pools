import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Info } from 'lucide-react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

interface ListTokenProps {
  onClose: () => void;
  signer: ethers.Signer;
  onSuccess: () => void;
  initialTokenAddress?: string | null;
}

const MARKETPLACE_ADDRESS = '0x54a898F830cA5d103F184939004AD5F9241CAaB7';
const PRDX_TOKEN_ADDRESS = '0x61Dd008F1582631Aa68645fF92a1a5ECAedBeD19';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

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

async function listPropertyToken(
  tokenAddress: string,
  amount: string,
  pricePerShare: string,
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
    const amountRaw = ethers.parseUnits(amount, tokenDecimals);

    const paymentTokenAddress = useUSDC ? USDC_ADDRESS : PRDX_TOKEN_ADDRESS;
    const paymentToken = new ethers.Contract(paymentTokenAddress, TOKEN_ABI, signer);

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
      amount,
      pricePerShare,
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

export default function ListToken({ onClose, signer, onSuccess, initialTokenAddress }: ListTokenProps) {
  const [formData, setFormData] = useState({
    tokenAddress: initialTokenAddress || '',
    amount: '',
    pricePerShare: '',
    useUSDC: false,
    projectWebsite: '',
    socialMediaLink: '',
    imageUrl: '',
    telegramUrl: '',
    projectDescription: '',
    useReferral: false,
    referralPercent: 5,
    duration: 2592000, // Default: 30 giorni (2592000 secondi)
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleReferralPercentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setFormData((prev) => ({
      ...prev,
      referralPercent: value >= 1 && value <= 100 ? value : prev.referralPercent,
    }));
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setFormData((prev) => ({
      ...prev,
      duration: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!ethers.isAddress(formData.tokenAddress)) throw new Error('Invalid token address');
      if (parseFloat(formData.amount) <= 0) throw new Error('Amount must be greater than 0');
      if (parseFloat(formData.pricePerShare) < 0.00001) throw new Error('Price must be at least 0.00001');
      if (formData.useReferral) {
        if (formData.referralPercent < 1 || formData.referralPercent > 100) {
          throw new Error('Referral percentage must be between 1 and 100');
        }
      }

      if (formData.projectWebsite.length > 256) throw new Error('Project website URL must be 256 characters or less');
      if (formData.socialMediaLink.length > 256) throw new Error('Twitter URL must be 256 characters or less');
      if (formData.imageUrl.length > 256) throw new Error('Image URL must be 256 characters or less');
      if (formData.telegramUrl.length > 256) throw new Error('Telegram URL must be 256 characters or less');
      if (formData.projectDescription.length > 1024) throw new Error('Project description must be 1024 characters or less');

      toast.loading('Listing token...', { id: 'list-token' });

      const receipt = await listPropertyToken(
        formData.tokenAddress,
        formData.amount,
        formData.pricePerShare,
        formData.useUSDC,
        formData.projectWebsite,
        formData.socialMediaLink,
        formData.imageUrl,
        formData.telegramUrl,
        formData.projectDescription,
        signer,
        formData.useReferral,
        formData.referralPercent,
        formData.duration
      );

      console.log('Listing receipt:', receipt);
      toast.success('Token listed successfully!', { id: 'list-token' });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Listing error details:', {
        message: error.message,
        reason: error.reason,
        data: error.data,
        code: error.code,
      });
      toast.error(error.message, { id: 'list-token' });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-gray-900 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg border border-gray-800"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Token Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="bg-yellow-500/10 p-4 rounded-lg mb-6 border border-yellow-500/20">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-yellow-200 mt-1 flex-shrink-0" />
            <div>
              <p className="text-yellow-200 font-medium">Minimum Values</p>
              <p className="text-yellow-200/80 text-sm">
                Price per token must be at least 0.00001 {formData.useUSDC ? 'USDC' : 'PRDX'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Token Details Section */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Enter the details of the token you want to list</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Token Address</label>
                <input
                  type="text"
                  name="tokenAddress"
                  value={formData.tokenAddress}
                  onChange={handleChange}
                  required
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="0x..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Amount to List</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  min="0.00001"
                  step="0.00001"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="How many tokens to list"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Price Per Token</label>
                <input
                  type="number"
                  name="pricePerShare"
                  value={formData.pricePerShare}
                  onChange={handleChange}
                  required
                  min="0.00001"
                  step="0.00001"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Price in selected payment token"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Payment Token</label>
                <select
                  name="useUSDC"
                  value={formData.useUSDC ? 'true' : 'false'}
                  onChange={(e) => handleCheckboxChange({ target: { name: 'useUSDC', checked: e.target.value === 'true' } } as React.ChangeEvent<HTMLInputElement>)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
                >
                  <option value="false">PRDX (Properties DEX Token)</option>
                  <option value="true">USDC</option>
                </select>
                <style jsx>{`
                  select[name="useUSDC"] {
                    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23a1a1aa' viewBox='0 0 16 16'%3E%3Cpath d='M7 10l-5-5 1.41-1.41L7 7.17l4.59-4.58L13 5l-6 6z'/%3E%3C/svg%3E") no-repeat right 0.75rem center/12px 12px;
                    padding-right: 2rem;
                  }
                  select[name="useUSDC"]:focus {
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%239c27b0' viewBox='0 0 16 16'%3E%3Cpath d='M7 10l-5-5 1.41-1.41L7 7.17l4.59-4.58L13 5l-6 6z'/%3E%3C/svg%3E");
                  }
                `}</style>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Listing Duration</label>
                <input
                  type="range"
                  name="duration"
                  value={formData.duration}
                  onChange={handleDurationChange}
                  min="600" // 10 minuti
                  max="5184000" // 60 giorni
                  step="600"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-sm text-gray-400 mt-2">
                  {formData.duration / 86400} days ({formData.duration} seconds)
                </p>
              </div>
            </div>
          </div>

          {/* Referral System Section */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Referral System</h3>
            <p className="text-sm text-gray-400 mb-4">Use referrals to incentivize others to promote your listing</p>
            
            <div className="flex items-center space-x-4 mb-4">
              <label className="text-sm font-medium text-gray-300">Enable Referral System</label>
              <input
                type="checkbox"
                name="useReferral"
                checked={formData.useReferral}
                onChange={handleCheckboxChange}
                className="w-5 h-5 bg-gray-700 border-gray-600 rounded text-purple-600 focus:ring-purple-500"
              />
            </div>

            {formData.useReferral && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Referral Percentage</label>
                <input
                  type="range"
                  name="referralPercent"
                  value={formData.referralPercent}
                  onChange={handleReferralPercentChange}
                  min="1"
                  max="100"
                  step="1"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-sm text-gray-400 mt-2">
                  {formData.referralPercent}% of the sale goes to the referrer
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Allow others to earn a percentage when someone buys through their referral link
                </p>
              </div>
            )}
          </div>

          {/* Token Metadata Section */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Token Metadata</h3>
            <p className="text-sm text-gray-400 mb-4">Add additional information about your property token (optional)</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Project Website</label>
                <input
                  type="url"
                  name="projectWebsite"
                  value={formData.projectWebsite}
                  onChange={handleChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://..."
                  maxLength={256}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Social Media Link</label>
                <input
                  type="url"
                  name="socialMediaLink"
                  value={formData.socialMediaLink}
                  onChange={handleChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://twitter.com/..."
                  maxLength={256}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Token Image URL</label>
                <input
                  type="url"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://..."
                  maxLength={256}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Telegram URL</label>
                <input
                  type="url"
                  name="telegramUrl"
                  value={formData.telegramUrl}
                  onChange={handleChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://t.me/..."
                  maxLength={256}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Project Description</label>
                <textarea
                  name="projectDescription"
                  value={formData.projectDescription}
                  onChange={handleChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Describe your property token..."
                  rows={4}
                  maxLength={1024}
                />
                <p className="text-xs text-gray-500 mt-1">Maximum 1024 characters</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              List Token
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}