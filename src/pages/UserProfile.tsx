import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MixedLayout } from "@/components/layouts/MixedLayout";
import { LinksLayout } from "@/components/layouts/LinksLayout";
import { BentoLayout } from "@/components/layouts/BentoLayout";
import { usePageMetadata } from "@/hooks/usePageMetadata";
import { LAYOUT_TYPES, type LayoutType } from "@/constants/layouts";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ProfileContent } from "@/components/layouts/ProfileContent";

interface Profile {
  username: string;
  full_name: string;
  bio: string;
  avatar_url: string;
  id: string;
  custom_title?: string;
}

interface ProfileSettings {
  links: Array<{
    id: string;
    title: string;
    url: string;
    icon?: string;
    display?: "title" | "icon" | "both";
  }>;
  theme_id: string;
  is_dark_mode: boolean;
  font_style?: string;
  layout_type?: LayoutType;
  background_style?: {
    id: string;
    url: string;
  } | null;
  favicon_url?: string;
}

interface Theme {
  id: string;
  background: string;
}

interface Link {
  id: string;
  title: string;
  url: string;
  icon?: string;
  display?: "title" | "icon" | "both";
  photo_url?: string;
}

const THEMES: { [key: string]: Theme } = {
  elegant: {
    id: "elegant",
    background: "bg-gradient-to-b from-purple-50 to-purple-100 dark:from-purple-950 dark:to-slate-950",
  },
  nature: {
    id: "nature",
    background: "bg-gradient-to-b from-green-50 to-emerald-100 dark:from-green-950 dark:to-slate-950",
  },
  ocean: {
    id: "ocean",
    background: "bg-gradient-to-b from-blue-50 to-cyan-100 dark:from-blue-950 dark:to-slate-950",
  },
  sunset: {
    id: "sunset",
    background: "bg-gradient-to-b from-orange-50 to-red-100 dark:from-orange-950 dark:to-slate-950",
  },
};

// Helper function to ensure URL has proper protocol
const formatUrl = (url: string): string => {
  if (!url) return "";
  
  // If URL already has a protocol, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If URL starts with //, add https:
  if (url.startsWith('//')) {
    return 'https:' + url;
  }
  
  // Otherwise, add https://
  return 'https://' + url;
};

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<ProfileSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  usePageMetadata({
    title: profile?.custom_title || profile?.full_name || `${profile?.username}'s Digital Identity`,
    faviconUrl: settings?.favicon_url
  });

  const handleEditProfile = () => {
    if (profile?.username) {
      navigate(`/edit-profile/${profile.username}`);
    } else {
      toast({
        title: "Error",
        description: "Cannot edit profile: username not found",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!username) {
          console.error("No username provided in URL");
          setError("Username is required");
          navigate('/404');
          return;
        }

        console.log("Fetching profile for username:", username);
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .maybeSingle();

        console.log("Profile fetch result:", { profile, profileError });

        if (profileError) {
          console.error("Profile error:", profileError);
          setError("Failed to load profile");
          toast({
            title: "Error",
            description: "Failed to load profile: " + (profileError instanceof Error ? profileError.message : "Unknown error"),
            variant: "destructive",
          });
          return;
        }

        if (!profile) {
          console.log("No profile found for username:", username);
          setError("Profile not found");
          toast({
            title: "Not Found",
            description: "This digital identity does not exist",
            variant: "destructive",
          });
          return;
        }

        setProfile(profile);

        const { data: settings, error: settingsError } = await supabase
          .from('profile_settings')
          .select('*')
          .eq('id', profile.id)
          .maybeSingle();

        console.log("Settings fetch result:", { settings, settingsError });

        if (settingsError) {
          console.error("Settings error:", settingsError);
          setError("Error loading profile settings");
          toast({
            title: "Error",
            description: "Failed to load profile settings",
            variant: "destructive",
          });
          return;
        }

        if (!settings) {
          console.error("No settings found for profile:", profile.id);
          setError("Profile settings not found");
          return;
        }
        
        let processedLinks: Link[] = [];
        if (settings.links && Array.isArray(settings.links)) {
          processedLinks = settings.links.map((link) => {
            const l = link as unknown as Link;
            return {
              id: l?.id || crypto.randomUUID(),
              title: l?.title || "",
              url: formatUrl(l?.url || ""), // Format URL here
              icon: l?.icon || "link",
              display: l?.display || "both",
              photo_url: l?.photo_url || ""
            };
          });
        }
        
        const typedSettings: ProfileSettings = {
          links: processedLinks,
          theme_id: settings.theme_id || 'elegant',
          is_dark_mode: settings.is_dark_mode || false,
          font_style: settings.font_style || 'sans',
          layout_type: (settings.layout_type as LayoutType) || LAYOUT_TYPES.LINKS,
          favicon_url: settings.favicon_url
        };

        if (settings.background_style) {
          try {
            typedSettings.background_style = JSON.parse(settings.background_style);
          } catch (e) {
            console.error("Failed to parse background style:", e);
          }
        }

        setSettings(typedSettings);

        if (settings.is_dark_mode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }

        document.documentElement.style.setProperty('--font-current', `var(--font-${typedSettings.font_style || 'sans'})`);
      } catch (error: unknown) {
        console.error('Error loading profile:', error);
        setError((error as Error).message);
        toast({
          title: "Error",
          description: "Failed to load digital identity",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();

    return () => {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.removeProperty('--font-current');
    };
  }, [username, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading digital identity...</p>
        </div>
      </div>
    );
  }

  if (error || !profile || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Digital Identity Not Found</h1>
          <p className="text-muted-foreground mb-4">{error || "This digital identity does not exist"}</p>
          <button
            onClick={() => navigate('/')}
            className="text-primary hover:underline transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const theme = THEMES[settings?.theme_id || 'elegant'] || THEMES.elegant;
  
  const hasBackgroundImage = settings.background_style && settings.background_style.id !== "none" && settings.background_style.url;
  
  const backgroundStyle = hasBackgroundImage
    ? { 
        backgroundImage: `url(${settings.background_style?.url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }
    : {};

  const textShadowClass = hasBackgroundImage ? "text-shadow" : "";

  return (
    <div 
      className={`min-h-screen transition-all duration-500 ${!hasBackgroundImage ? theme.background : ''}`}
      style={backgroundStyle}
    >
      <div className={`min-h-screen transition-all duration-300 ${hasBackgroundImage ?
        'bg-black/40 backdrop-blur-sm' : ''}`}>
        <div className="container max-w-2xl px-4 py-8 mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="relative w-40 h-40 mx-auto mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full animate-pulse opacity-80" />
              <Avatar className="w-full h-full border-4 border-white/50 dark:border-black/20 shadow-lg">
                <AvatarImage src={profile.avatar_url} alt={profile.full_name} className="object-cover" />
                <AvatarFallback className="text-3xl font-bold">{profile.full_name?.charAt(0) || "?"}</AvatarFallback>
              </Avatar>
            </div>
            <h1 className={`text-2xl font-bold mb-2 text-white ${textShadowClass}`}>{profile.full_name}</h1>
            <p className={`text-white/80 mb-4 ${textShadowClass}`}>@{profile.username}</p>
            {profile.bio && (
              <p className={`text-white/90 max-w-md mx-auto mb-8 ${textShadowClass}`}>{profile.bio}</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <ProfileContent 
              layoutType={settings?.layout_type || LAYOUT_TYPES.LINKS}
              links={settings?.links || []}
              textShadowClass={textShadowClass}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
