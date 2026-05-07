import { useState, useEffect } from 'react';
import { User, Briefcase } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { supabase } from '../../lib/supabase';

export interface Member {
  id: string;
  name: string;
  role: 'admin' | 'staff' | 'manager';
  phone: string;
}

interface UserLoginProps {
  isOpen: boolean;
  onClose?: () => void;
  onLogin: (member: Member) => void;
  isRequired?: boolean;
}

export function UserLogin({ isOpen, onClose, onLogin, isRequired = false }: UserLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState({
    fullName: '',
    role: ''
  });

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const user = (await supabase.auth.getUser()).data.user;
        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error('Error fetching user info:', error);
          } else {
            setUserInfo({
              fullName: data.full_name || 'Unknown',
              role: data.role || 'Unknown'
            });
          }
        }
      } catch (err) {
        console.error('Error fetching user info:', err);
      }
    };

    fetchUserInfo();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
        return;
      }

      if (data.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        const member = profileData
          ? {
              id: profileData.id,
              name: profileData.full_name || email.split('@')[0],
              role: profileData.role || 'staff',
              phone: profileData.phone || '',
            }
          : {
              id: data.user.id,
              name:
                data.user.user_metadata?.full_name ||
                data.user.email?.split('@')[0] ||
                'Staff Member',
              role: 'staff' as const,
              phone: '',
            };

        if (profileError && !profileData) {
          console.warn('Profile lookup failed, falling back to auth user:', profileError);
        }

        onLogin(member);
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={!isRequired ? onClose : undefined}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={isRequired ? (e) => e.preventDefault() : undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#7BA886]" />
            Staff Portal
          </DialogTitle>
          <p className="text-xs text-gray-500 mt-1">Internal system - Staff only</p>
        </DialogHeader>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block mb-2 text-sm font-medium">
              Email:
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@minosteppetsupplies.com"
              className="h-12"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="password" className="block mb-2 text-sm font-medium">
              Password:
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-12"
            />
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <Button
            type="submit"
            disabled={isLoading || !email || !password}
            className="w-full bg-[#7BA886] hover:bg-[#5A8A6B] text-white h-12"
          >
            {isLoading ? 'Authenticating...' : 'Login'}
          </Button>
        </form>

        <div className="profile-info">
          <p>{userInfo.fullName}</p>
          <p>{userInfo.role}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default UserLogin;
