
export function NavigationHeader() {
    return(
        <header className="flex h-7 items-center justify-between border-b border-border bg-card px-2">
            <div className="flex ">
                <div className=" items-center gap-4 bg-blue-100 px-3 border-r border-border">
                    <p className="text-2x tracking-tight">FAS</p>
                </div>
                <div className="px-2"></div>
                <div className=" items-center gap-4 bg-blue-100 px-3 border-r border-border">
                    <p className="text-2x tracking-tight">Savings</p>
                </div>
                <div className="px-2"></div>
                <div className="items-center gap-4 bg-blue-100 px-3 border-r border-border">
                    <p className="text-2x tracking-tight">Open-Account</p>
                </div>
            </div>
        </header>
    );
}