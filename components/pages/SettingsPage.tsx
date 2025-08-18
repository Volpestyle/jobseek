import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import {
  Save,
  Crown,
  Bell,
  Shield,
  Palette,
  Zap,
  CreditCard,
  Download,
  Trash2,
} from "lucide-react";

interface SettingsPageProps {
  isDarkMode: boolean;
  setIsDarkMode: (value: boolean) => void;
}

export function SettingsPage({ isDarkMode, setIsDarkMode }: SettingsPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account preferences and subscription.
        </p>
      </div>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Subscription
          </CardTitle>
          <CardDescription>
            Manage your jobseek subscription and billing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4>Pro Plan</h4>
                <Badge>Current Plan</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Unlimited searches, priority support, advanced analytics
              </p>
              <p className="text-sm">$29/month • Next billing: Aug 15, 2025</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <CreditCard className="h-4 w-4 mr-2" />
                Billing
              </Button>
              <Button variant="outline">Upgrade</Button>
            </div>
          </div>

          <div className="space-y-4">
            <h5>Usage This Month</h5>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-3 border rounded">
                <p className="text-2xl">12</p>
                <p className="text-sm text-muted-foreground">Searches Used</p>
                <p className="text-xs text-muted-foreground">∞ Unlimited</p>
              </div>
              <div className="text-center p-3 border rounded">
                <p className="text-2xl">147</p>
                <p className="text-sm text-muted-foreground">Jobs Found</p>
                <p className="text-xs text-muted-foreground">∞ Unlimited</p>
              </div>
              <div className="text-center p-3 border rounded">
                <p className="text-2xl">25</p>
                <p className="text-sm text-muted-foreground">
                  Auto Applications
                </p>
                <p className="text-xs text-muted-foreground">∞ Unlimited</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Automation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Automation
          </CardTitle>
          <CardDescription>
            Configure how jobseek handles job applications automatically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Auto-apply to saved jobs</Label>
              <p className="text-sm text-muted-foreground">
                Automatically submit applications to jobs you've saved
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Smart filtering</Label>
              <p className="text-sm text-muted-foreground">
                Use AI to filter out jobs that don't match your criteria
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Auto-save high-match jobs</Label>
              <p className="text-sm text-muted-foreground">
                Automatically save jobs with 85%+ match score
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>Application delay</Label>
            <Select defaultValue="5">
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Immediate</SelectItem>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Delay between automatic applications to appear more human
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Choose what notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Email notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive updates about your job searches via email
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>New job alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when new jobs matching your criteria are found
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Interview reminders</Label>
              <p className="text-sm text-muted-foreground">
                Receive reminders about upcoming interviews
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Weekly summary</Label>
              <p className="text-sm text-muted-foreground">
                Weekly report of your job search activity and progress
              </p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize how jobseek looks and feels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Dark mode</Label>
              <p className="text-sm text-muted-foreground">
                Use dark theme across the application
              </p>
            </div>
            <Switch checked={isDarkMode} onCheckedChange={setIsDarkMode} />
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>Compact view</Label>
            <Switch />
            <p className="text-sm text-muted-foreground">
              Show more content in less space
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy & Security
          </CardTitle>
          <CardDescription>
            Manage your privacy and security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Two-factor authentication</Label>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security to your account
              </p>
            </div>
            <Button variant="outline" size="sm">
              Enable
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Data export</Label>
              <p className="text-sm text-muted-foreground">
                Download all your data from jobseek
              </p>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Delete account</Label>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all data
              </p>
            </div>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button>
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}
