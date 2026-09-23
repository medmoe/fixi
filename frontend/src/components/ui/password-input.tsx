import * as React from "react"
import {Eye, EyeOff} from "lucide-react"
import {useTranslation} from "react-i18next"

import {cn} from "@/lib/utils"
import {Input, type InputProps} from "@/components/ui/input"

export interface PasswordInputProps extends Omit<InputProps, "type"> {
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
    ({className, ...props}, ref) => {
        const {t} = useTranslation()
        const [visible, setVisible] = React.useState(false)

        return (
            <div className="relative">
                <Input
                    ref={ref}
                    type={visible ? "text" : "password"}
                    className={cn("pe-9", className)}
                    {...props}
                />
                <button
                    type="button"
                    onClick={() => setVisible((prev) => !prev)}
                    className="absolute inset-y-0 end-0 flex items-center px-2.5 text-muted-foreground hover:text-foreground"
                    aria-label={visible ? t('passwordInput.hide') : t('passwordInput.show')}
                    tabIndex={-1}
                >
                    {visible ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true"/>
                    ) : (
                        <Eye className="h-4 w-4" aria-hidden="true"/>
                    )}
                </button>
            </div>
        )
    }
)

PasswordInput.displayName = "PasswordInput"
export {PasswordInput}
