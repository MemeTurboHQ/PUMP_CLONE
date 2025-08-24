"use client"

import { useState, useMemo } from "react"
import { ConnectionProvider, WalletProvider, useWallet, useConnection } from "@solana/wallet-adapter-react"
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"
import { UnsafeBurnerWalletAdapter } from "@solana/wallet-adapter-wallets"
import { WalletModalProvider, WalletMultiButton, WalletDisconnectButton } from "@solana/wallet-adapter-react-ui"
import { clusterApiUrl, PublicKey, Keypair, Transaction, SystemProgram ,Connection} from "@solana/web3.js"
import {
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Wallet, Coins, Upload, AlertCircle, CheckCircle, ImageIcon, FileText, Hash, ExternalLink } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { api_clone, api_info } from "@/core/request"

// Default styles that can be overridden by your app
require("@solana/wallet-adapter-react-ui/styles.css")

interface TokenFormData {
  name: string
  symbol: string
  description: string
  imageUrl: string
  metadataUrl: string
  decimals: number
  initialSupply: string
  website: string
  twitter: string
  telegram: string
}

interface DeploymentStep {
  name: string
  status: "pending" | "processing" | "completed" | "error"
  txHash?: string
}

function SolanaTokenClonePage() {
  const { connected, publicKey, sendTransaction } = useWallet()
  // const { connection } = useConnection()
  const connection =new Connection("https://mainnet.helius-rpc.com/?api-key=a32e6052-b2ed-491f-9521-ac6df5e9665a", 'confirmed');
  const [cloneAddress, setCloneAddress] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [deploymentSteps, setDeploymentSteps] = useState<DeploymentStep[]>([])
  const [createdMintAddress, setCreatedMintAddress] = useState("")

  const [tokenData, setTokenData] = useState<TokenFormData>({
    name: "",
    symbol: "",
    description: "",
    imageUrl: "",
    metadataUrl: "",
    decimals: 9,
    initialSupply: "1000000",
    website: "",
    twitter: "",
    telegram: "",
  })

  const [formErrors, setFormErrors] = useState<Partial<TokenFormData>>({})

  const validateForm = (): boolean => {
    const errors: Partial<TokenFormData> = {}

    if (!tokenData.name.trim()) {
      errors.name = "Token name is required"
    } else if (tokenData.name.length > 32) {
      errors.name = "Token name must be 32 characters or less"
    }

    if (!tokenData.symbol.trim()) {
      errors.symbol = "Token symbol is required"
    } else if (tokenData.symbol.length > 10) {
      errors.symbol = "Token symbol must be 10 characters or less"
    }

    if (tokenData.description.length > 200) {
      errors.description = "Description must be 200 characters or less"
    }

    if (tokenData.imageUrl && !isValidUrl(tokenData.imageUrl)) {
      errors.imageUrl = "Please enter a valid image URL"
    }

    if (tokenData.metadataUrl && !isValidUrl(tokenData.metadataUrl)) {
      errors.metadataUrl = "Please enter a valid metadata URL"
    }

    if (tokenData.website && !isValidUrl(tokenData.website)) {
      errors.website = "Please enter a valid website URL"
    }

    if (tokenData.initialSupply && (isNaN(Number(tokenData.initialSupply)) || Number(tokenData.initialSupply) <= 0)) {
      errors.initialSupply = "Initial supply must be a positive number"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const updateTokenData = (field: keyof TokenFormData, value: string | number) => {
    setTokenData((prev) => ({ ...prev, [field]: value }))
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const updateStepStatus = (stepName: string, status: DeploymentStep["status"], txHash?: string) => {
    setDeploymentSteps((prev) => prev.map((step) => (step.name === stepName ? { ...step, status, txHash } : step)))
  }

  const createTokenMetadata = async (): Promise<string> => {
    // In a real implementation, you would upload this to IPFS or Arweave
    const metadata = {
      name: tokenData.name,
      symbol: tokenData.symbol,
      description: tokenData.description,
      image: tokenData.imageUrl,
      external_url: tokenData.website,
      attributes: [],
      properties: {
        files: tokenData.imageUrl
          ? [
              {
                uri: tokenData.imageUrl,
                type: "image/png",
              },
            ]
          : [],
        category: "image",
        creators: [
          {
            address: publicKey?.toString() || "",
            share: 100,
          },
        ],
      },
    }

    // For demo purposes, we'll return a mock URL
    // In production, upload to IPFS/Arweave and return the actual URL
    return tokenData.metadataUrl || `https://mock-metadata.com/${Date.now()}.json`
  }

  const handleIdentifyToken = async () => {
    if (!cloneAddress) return

    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      const mintPublicKey = new PublicKey(cloneAddress)
      const mintInfo = await connection.getParsedAccountInfo(mintPublicKey)
      const info = await api_info(mintPublicKey.toBase58())
      console.log(info)
      if(!info || !info?.name)
      {
        throw new Error("Token mint not found")
      }
      setTokenData((prev) => ({
      ...prev,
        name: info?.name,
        symbol: info?.symbol,
        description: info?.description,
        decimals:  9,
        metadataUrl: info?.metadata,
      }))
      setSuccess("Token metadata identified successfully!")

      // if (!mintInfo.value) {
      //   throw new Error("Token mint not found")
      // }

      // const mintData = mintInfo.value.data
      // if (!("parsed" in mintData)) {
      //   throw new Error("Invalid token mint data")
      // }

      // const parsedData = mintData.parsed
      // if (parsedData.type !== "mint") {
      //   throw new Error("Address is not a token mint")
      // }

      // try {
      //   const metadataPDA = await PublicKey.findProgramAddress(
      //     [
      //       Buffer.from("metadata"),
      //       new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(),
      //       mintPublicKey.toBuffer(),
      //     ],
      //     new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"),
      //   )

      //   const metadataAccount = await connection.getAccountInfo(metadataPDA[0])

      //   if (metadataAccount) {
      //     setTokenData((prev) => ({
      //       ...prev,
      //       name: `Token ${cloneAddress.slice(0, 8)}`,
      //       symbol: `TK${cloneAddress.slice(0, 4).toUpperCase()}`,
      //       description: `Cloned from ${cloneAddress}`,
      //       decimals: parsedData.info.decimals || 9,
      //       metadataUrl: "https://example.com/metadata.json",
      //     }))
      //     setSuccess("Token metadata identified successfully!")
      //   } else {
      //     setTokenData((prev) => ({
      //       ...prev,
      //       name: `Unknown Token ${cloneAddress.slice(0, 8)}`,
      //       symbol: `UNK${cloneAddress.slice(0, 3).toUpperCase()}`,
      //       description: `Token cloned from ${cloneAddress}`,
      //       decimals: parsedData.info.decimals || 9,
      //     }))
      //     setSuccess("Token found but no metadata available. Using default values.")
      //   }
      // } catch (metadataError) {
      //   setTokenData((prev) => ({
      //     ...prev,
      //     name: `Token ${cloneAddress.slice(0, 8)}`,
      //     symbol: `TK${cloneAddress.slice(0, 4).toUpperCase()}`,
      //     description: `Basic token cloned from ${cloneAddress}`,
      //     decimals: 9,
      //   }))
      //   setSuccess("Token identified with basic info. Metadata parsing failed.")
      // }
    } catch (error: any) {
      console.error("Error identifying token:", error)
      setError(error.message || "Failed to identify token. Please check the address.")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePublishToken = async () => {
    if (!connected || !validateForm() || !publicKey) return

    setIsLoading(true)
    setError("")
    setSuccess("")
    setCreatedMintAddress("")

    // Initialize deployment steps
    const steps: DeploymentStep[] = [
      { name: "Creating clone transaction", status: "pending" },
      { name: "Send clone transaction", status: "pending" },
    ]
    setDeploymentSteps(steps)

    try {
      // Step 1: Create metadata
      updateStepStatus("Creating clone transaction", "processing")
      const txs = await api_clone(publicKey.toBase58(),cloneAddress);
      console.log(txs,cloneAddress)
      if(txs && txs?.tx)
      {
        const txn = Transaction.from(
            Buffer.from(txs.tx,"base64")
        )
        updateStepStatus("Creating clone transaction", "completed")
        updateStepStatus("Send clone transaction", "processing")
        const hash =  await sendTransaction(txn,connection)
        updateStepStatus("Send clone transaction", "completed")

        setSuccess(
          `Tx ${hash} success...`,
        )
      }else{
              setError( "Failed to publish token")
      }
      
      updateStepStatus("Creating metadata", "completed")

      // await connection.confirmTransaction(mintSignature, "confirmed")
      // updateStepStatus("Minting initial supply", "completed", mintSignature)

      // setCreatedMintAddress(mintKeypair.publicKey.toString())
      // setSuccess(
      //   `Token "${tokenData.name}" (${tokenData.symbol}) created successfully! Mint address: ${mintKeypair.publicKey.toString()}`,
      // )
    } catch (error: any) {
      console.error("Error publishing token:", error)
      setError(error.message || "Failed to publish token")

      // Mark current processing step as error
      setDeploymentSteps((prev) =>
        prev.map((step) => (step.status === "processing" ? { ...step, status: "error" } : step)),
      )
    } finally {
      setIsLoading(false)
    }
  }

  const getStepProgress = () => {
    const completedSteps = deploymentSteps.filter((step) => step.status === "completed").length
    return (completedSteps / deploymentSteps.length) * 100
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8 p-4 pixel-card">
          <div className="flex items-center gap-3">
            <Coins className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground font-mono">PUMP TOKEN CLONE</h1>
          </div>
          <div className="flex items-center gap-4">
            {connected ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground font-mono">{publicKey?.toString().slice(0, 8)}...</span>
                <WalletDisconnectButton className="pixel-button" />
              </div>
            ) : (
              <WalletMultiButton className="pixel-button" />
            )}
          </div>
        </header>

        {error && (
          <Alert className="mb-6 border-destructive bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="font-mono">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 border-green-500 bg-green-500/10">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="font-mono">{success}</AlertDescription>
          </Alert>
        )}

        {deploymentSteps.length > 0 && (
          <Card className="mb-6 pixel-card">
            <CardHeader>
              <CardTitle className="font-mono text-sm">DEPLOYMENT PROGRESS</CardTitle>
              <Progress value={getStepProgress()} className="w-full" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {deploymentSteps.map((step, index) => (
                  <div key={index} className="flex items-center justify-between text-sm font-mono">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          step.status === "completed"
                            ? "bg-green-500"
                            : step.status === "processing"
                              ? "bg-yellow-500 animate-pulse"
                              : step.status === "error"
                                ? "bg-red-500"
                                : "bg-gray-400"
                        }`}
                      />
                      <span>{step.name}</span>
                    </div>
                    {step.txHash && (
                      <a
                        href={`https://explorer.solana.com/tx/${step.txHash}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-accent flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View TX
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {createdMintAddress && (
          <Card className="mb-6 pixel-card border-green-500">
            <CardHeader>
              <CardTitle className="font-mono text-sm text-green-600">TOKEN CREATED SUCCESSFULLY!</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex justify-between">
                  <span>Mint Address:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">
                      {createdMintAddress.slice(0, 8)}...{createdMintAddress.slice(-8)}
                    </span>
                    <a
                      href={`https://explorer.solana.com/address/${createdMintAddress}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-accent"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>Token Name:</span>
                  <span>{tokenData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Symbol:</span>
                  <span>{tokenData.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span>Initial Supply:</span>
                  <span>{tokenData.initialSupply}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Token Identification Card */}
          <Card className="pixel-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono">
                <Wallet className="w-5 h-5 text-primary" />
                IDENTIFY TOKEN
              </CardTitle>
              <CardDescription className="font-mono text-sm">
                Enter a token address to clone its properties
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="clone-address" className="font-mono text-sm font-bold">
                  Clone Token Address
                </Label>
                <Input
                  id="clone-address"
                  value={cloneAddress}
                  onChange={(e) => setCloneAddress(e.target.value)}
                  placeholder="Enter Solana token address..."
                  className="pixel-input font-mono"
                />
              </div>
              <Button
                onClick={handleIdentifyToken}
                disabled={!cloneAddress || isLoading}
                className="pixel-button w-full font-mono"
              >
                {isLoading ? "IDENTIFYING..." : "IDENTIFY TOKEN"}
              </Button>
            </CardContent>
          </Card>

          {/* Enhanced Token Form */}
          <Card className="pixel-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono">
                <Upload className="w-5 h-5 text-primary" />
                CREATE TOKEN
              </CardTitle>
              <CardDescription className="font-mono text-sm">Configure your new token properties</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info Section */}
              <div className="space-y-4">
                <h4 className="font-mono font-bold text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  BASIC INFORMATION
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="token-name" className="font-mono text-sm font-bold">
                      Token Name *
                    </Label>
                    <Input
                      id="token-name"
                      value={tokenData.name}
                      onChange={(e) => updateTokenData("name", e.target.value)}
                      placeholder="My Awesome Token"
                      className={`pixel-input font-mono ${formErrors.name ? "border-destructive" : ""}`}
                      maxLength={32}
                    />
                    {formErrors.name && <p className="text-xs text-destructive font-mono mt-1">{formErrors.name}</p>}
                  </div>

                  <div>
                    <Label htmlFor="token-symbol" className="font-mono text-sm font-bold">
                      Token Symbol *
                    </Label>
                    <Input
                      id="token-symbol"
                      value={tokenData.symbol}
                      onChange={(e) => updateTokenData("symbol", e.target.value.toUpperCase())}
                      placeholder="MAT"
                      className={`pixel-input font-mono ${formErrors.symbol ? "border-destructive" : ""}`}
                      maxLength={10}
                    />
                    {formErrors.symbol && (
                      <p className="text-xs text-destructive font-mono mt-1">{formErrors.symbol}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="token-description" className="font-mono text-sm font-bold">
                    Description
                  </Label>
                  <Textarea
                    id="token-description"
                    value={tokenData.description}
                    onChange={(e) => updateTokenData("description", e.target.value)}
                    placeholder="Describe your token..."
                    className={`pixel-input font-mono resize-none ${formErrors.description ? "border-destructive" : ""}`}
                    maxLength={200}
                    rows={3}
                  />
                  <div className="flex justify-between items-center mt-1">
                    {formErrors.description && (
                      <p className="text-xs text-destructive font-mono">{formErrors.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground font-mono ml-auto">
                      {tokenData.description.length}/200
                    </p>
                  </div>
                </div>
              </div>

              {/* Technical Settings */}
              {/* <div className="space-y-4">
                <h4 className="font-mono font-bold text-sm flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  TECHNICAL SETTINGS
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="decimals" className="font-mono text-sm font-bold">
                      Decimals
                    </Label>
                    <Select
                      value={tokenData.decimals.toString()}
                      onValueChange={(value) => updateTokenData("decimals", Number.parseInt(value))}
                    >
                      <SelectTrigger className="pixel-input font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 2, 6, 8, 9].map((decimal) => (
                          <SelectItem key={decimal} value={decimal.toString()}>
                            {decimal} decimals
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="initial-supply" className="font-mono text-sm font-bold">
                      Initial Supply
                    </Label>
                    <Input
                      id="initial-supply"
                      value={tokenData.initialSupply}
                      onChange={(e) => updateTokenData("initialSupply", e.target.value)}
                      placeholder="1000000"
                      className={`pixel-input font-mono ${formErrors.initialSupply ? "border-destructive" : ""}`}
                      type="number"
                    />
                    {formErrors.initialSupply && (
                      <p className="text-xs text-destructive font-mono mt-1">{formErrors.initialSupply}</p>
                    )}
                  </div>
                </div>
              </div> */}

              {/* Media & Links */}
              <div className="space-y-4">
                <h4 className="font-mono font-bold text-sm flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  MEDIA & LINKS
                </h4>
                <div className="space-y-4">
                  {/* <div>
                    <Label htmlFor="image-url" className="font-mono text-sm font-bold">
                      Image URL
                    </Label>
                    <Input
                      id="image-url"
                      value={tokenData.imageUrl}
                      onChange={(e) => updateTokenData("imageUrl", e.target.value)}
                      placeholder="https://example.com/token-image.png"
                      className={`pixel-input font-mono ${formErrors.imageUrl ? "border-destructive" : ""}`}
                    />
                    {formErrors.imageUrl && (
                      <p className="text-xs text-destructive font-mono mt-1">{formErrors.imageUrl}</p>
                    )}
                  </div> */}

                  <div>
                    <Label htmlFor="metadata-url" className="font-mono text-sm font-bold">
                      Metadata URL
                    </Label>
                    <Input
                      id="metadata-url"
                      value={tokenData.metadataUrl}
                      onChange={(e) => updateTokenData("metadataUrl", e.target.value)}
                      placeholder="https://example.com/metadata.json"
                      className={`pixel-input font-mono ${formErrors.metadataUrl ? "border-destructive" : ""}`}
                    />
                    {formErrors.metadataUrl && (
                      <p className="text-xs text-destructive font-mono mt-1">{formErrors.metadataUrl}</p>
                    )}
                  </div>

                  {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="website" className="font-mono text-sm font-bold">
                        Website
                      </Label>
                      <Input
                        id="website"
                        value={tokenData.website}
                        onChange={(e) => updateTokenData("website", e.target.value)}
                        placeholder="https://mytoken.com"
                        className={`pixel-input font-mono ${formErrors.website ? "border-destructive" : ""}`}
                      />
                      {formErrors.website && (
                        <p className="text-xs text-destructive font-mono mt-1">{formErrors.website}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="twitter" className="font-mono text-sm font-bold">
                        Twitter
                      </Label>
                      <Input
                        id="twitter"
                        value={tokenData.twitter}
                        onChange={(e) => updateTokenData("twitter", e.target.value)}
                        placeholder="@mytoken"
                        className="pixel-input font-mono"
                      />
                    </div>

                    <div>
                      <Label htmlFor="telegram" className="font-mono text-sm font-bold">
                        Telegram
                      </Label>
                      <Input
                        id="telegram"
                        value={tokenData.telegram}
                        onChange={(e) => updateTokenData("telegram", e.target.value)}
                        placeholder="@mytokengroup"
                        className="pixel-input font-mono"
                      />
                    </div>
                  </div> */}
                </div>
              </div>

              <Button
                onClick={handlePublishToken}
                disabled={!connected || !tokenData.name || !tokenData.symbol || isLoading}
                className="pixel-button w-full font-mono"
              >
                {isLoading ? "PUBLISHING..." : "PUBLISH TOKEN"}
              </Button>

              {!connected && (
                <p className="text-sm text-muted-foreground text-center font-mono">Connect wallet to publish token</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Status Section */}
        <div className="mt-8 pixel-card">
          <h3 className="font-mono font-bold mb-4">STATUS</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-mono">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
              <span>Wallet: {connected ? "CONNECTED" : "DISCONNECTED"}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${tokenData.name ? "bg-green-500" : "bg-gray-400"}`} />
              <span>Token Info: {tokenData.name ? "READY" : "PENDING"}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${connected && tokenData.name ? "bg-green-500" : "bg-gray-400"}`} />
              <span>Ready to Deploy: {connected && tokenData.name ? "YES" : "NO"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const network = WalletAdapterNetwork.Devnet
  const endpoint = useMemo(() => clusterApiUrl(network), [network])

  const wallets = useMemo(() => [new UnsafeBurnerWalletAdapter()], [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <SolanaTokenClonePage />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
