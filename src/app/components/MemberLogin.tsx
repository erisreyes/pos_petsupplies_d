import { useState } from 'react';
import { User, Phone, Heart } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

interface Member {
  id: string;
  name: string;
  phone: string;
  petName?: string;
  petBirthday?: string;
  loyaltyPoints: number;
}

interface MemberLoginProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (member: Member) => void;
}

export function MemberLogin({ isOpen, onClose, onLogin }: MemberLoginProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Mock member data
  const mockMembers: Record<string, Member> = {
    '09171234567': {
      id: 'M001',
      name: 'Maria Santos',
      phone: '09171234567',
      petName: 'Buddy',
      petBirthday: '2021-05-15',
      loyaltyPoints: 450,
    },
    '09181234567': {
      id: 'M002',
      name: 'Juan Dela Cruz',
      phone: '09181234567',
      petName: 'Whiskers',
      petBirthday: '2020-08-22',
      loyaltyPoints: 320,
    },
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    const member = mockMembers[phoneNumber];
    if (member) {
      onLogin(member);
      setPhoneNumber('');
    } else {
      alert('Member not found. Please try again or checkout as guest.');
    }

    setIsLoading(false);
  };

  const handleQuickLogin = (phone: string) => {
    const member = mockMembers[phone];
    if (member) {
      onLogin(member);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-[#7BA886]" />
            Member Login
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="phone" className="block mb-2 text-sm">
              Enter Phone Number:
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="09XX XXX XXXX"
                className="pl-10 h-12"
                autoFocus
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={!phoneNumber || isLoading}
            className="w-full bg-[#7BA886] hover:bg-[#5A8A6B] text-white h-12"
          >
            {isLoading ? 'Loading...' : 'Login'}
          </Button>

          {/* Demo Quick Login */}
          <div className="border-t pt-4">
            <p className="text-sm text-gray-500 mb-3">Quick demo login:</p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('09171234567')}
                className="w-full p-3 bg-[#F5F1E8] rounded-lg hover:bg-[#E8DFD0] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#7BA886] flex items-center justify-center text-white">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Maria Santos</p>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Heart className="w-3 h-3 text-red-400 fill-red-400" />
                      <span>Buddy's Mom • 450 pts</span>
                    </div>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('09181234567')}
                className="w-full p-3 bg-[#F5F1E8] rounded-lg hover:bg-[#E8DFD0] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#6B9BD1] flex items-center justify-center text-white">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Juan Dela Cruz</p>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Heart className="w-3 h-3 text-red-400 fill-red-400" />
                      <span>Whiskers' Dad • 320 pts</span>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            className="w-full"
          >
            Continue as Guest
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
