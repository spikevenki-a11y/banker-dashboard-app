import { DashboardWrapper } from "@/app/_components/dashboard-wrapper";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"

export default function SavingsOpenAccountPage() {
    return(
        <DashboardWrapper>
            <div className="flex-1 space-y-2 p-2 border rounded-lg bg-background">
                <div className="grid grid-cols-3 gap-4 border-b ">
                    <div className="space-y-2 px-5 ">
                        <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Member No for sb</Label>
                        <input
                              id="MemberNo"
                              placeholder=""
                              className="border"
                            />
                    </div>
                    <div className="space-y-2 px-5 ">
                        <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Member name</Label>
                        <input
                              id="MemberName"
                              placeholder=""
                              className="border"
                            />
                    </div>
                </div>
                {/* Form for opening a savings account */}
            </div>

        </DashboardWrapper>
    );
}