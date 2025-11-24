'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { scanCardImage, formatCardNumber, ScannedCardData } from '@/lib/utils/card-scanner';

interface CardScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCardScanned: (cardData: ScannedCardData) => void;
}

export function CardScannerModal({ isOpen, onClose, onCardScanned }: CardScannerModalProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string>('');

  // Start camera when modal opens
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setError('');
      
      // Request camera access with rear camera preference (mobile)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use rear camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      console.error('[CardScanner] Camera error:', err);
      setError('Unable to access camera. Please check permissions.');
      toast({
        title: 'Camera Access Required',
        description: 'Please allow camera access to scan your card.',
        variant: 'destructive',
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setScanning(true);
    
    try {
      // Capture frame from video
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) throw new Error('Canvas context not available');
      
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob for OCR
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/jpeg', 0.95);
      });
      
      // Scan the image
      const cardData = await scanCardImage(blob);
      
      if (cardData) {
        toast({
          title: 'Card Scanned Successfully!',
          description: `Found card ending in ${cardData.cardNumber.slice(-4)}`,
        });
        
        onCardScanned(cardData);
        stopCamera();
        onClose();
      } else {
        toast({
          title: 'No Card Detected',
          description: 'Please ensure the card is clearly visible and try again.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      console.error('[CardScanner] Scan error:', err);
      toast({
        title: 'Scan Failed',
        description: 'Could not read card. Please try again or enter manually.',
        variant: 'destructive',
      });
    } finally {
      setScanning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4" data-testid="modal-scan-card">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Scan Credit Card
              </CardTitle>
              <CardDescription className="mt-2">
                Position your card in the frame to automatically capture details
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              data-testid="button-close-scan-modal"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera Preview */}
          <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Card Frame Overlay */}
            {cameraActive && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-4/5 max-w-md aspect-[1.586/1] border-4 border-primary rounded-2xl shadow-2xl">
                  {/* Corner guides */}
                  <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-2xl" />
                  <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-2xl" />
                  <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-2xl" />
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-2xl" />
                </div>
              </div>
            )}
            
            {/* Error State */}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <div className="text-center text-white space-y-2 p-6">
                  <AlertCircle className="w-12 h-12 mx-auto text-red-400" />
                  <p className="font-medium">{error}</p>
                  <Button onClick={startCamera} variant="secondary" size="sm">
                    Try Again
                  </Button>
                </div>
              </div>
            )}
            
            {/* Scanning Overlay */}
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <div className="text-center text-white space-y-3 p-6">
                  <Loader2 className="w-12 h-12 mx-auto animate-spin" />
                  <p className="font-medium">Scanning card...</p>
                  <p className="text-sm text-gray-300">This may take a few seconds</p>
                </div>
              </div>
            )}
          </div>

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Instructions */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">Tips for best results:</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Ensure good lighting and avoid glare or shadows</li>
              <li>Hold your card flat within the frame guidelines</li>
              <li>Keep the card steady and ensure all numbers are visible</li>
              <li>Make sure the card fills most of the frame</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="flex-1"
              disabled={scanning}
              data-testid="button-cancel-scan"
            >
              Cancel
            </Button>
            <Button
              onClick={captureAndScan}
              className="flex-1"
              disabled={!cameraActive || scanning}
              data-testid="button-capture-card"
            >
              {scanning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Capture & Scan
                </>
              )}
            </Button>
          </div>

          {/* Security Note */}
          <div className="bg-muted/50 border rounded-lg p-3">
            <p className="text-xs text-center text-muted-foreground">
              <strong>Secure:</strong> Card scanning happens locally on your device. 
              No images are uploaded or stored.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

