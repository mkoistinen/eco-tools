/*
    Copyright (C) 2009  Martin Koistinen

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

function initialisePage()
{
	// Ensure we have the function(s) we require
	if (!Number.prototype.toFixed)
	{
		Number.prototype.toFixed = function(precision) {
			var power = Math.pow(10, precision || 0);
			return String(Math.round(this * power)/power);
		}
	}

	Number.prototype.toCurFormat = function(precision) {
		var signed = false;
		var val = this;
		
		if (precision < 0) precision = 0;
		
		if (val < 0) { signed = true; val = Math.abs(val); }

		val = val.toFixed(precision).toString().split(".");

		var result = "";
		var len = val[0].length;

		while (len > 3)
		{
			result = "," + val[0].substr(len-3,3) + result;
			len-=3;
		}

		result = val[0].substr(0,len) + result;

		if (signed)
			result = "-" + result;

		if (!isNaN(val[1]))
			result = result + "." + val[1];

		return result;
	}
	
	// Simple utility function to ensure values are in the required range
	Number.prototype.range = function(min, max) {
		if (isNaN(this)) this.value = 0.0;
		if (this>max) return new Number(max);
		if (this<min) return new Number(min);
		return this;
	}
	
	recompute(1);
}

// This is a simple timer that will auto-recompute 5 seconds after being set.
var timerOn = 0;
var timer = 0;
var timerComputeStep;

function startTimer(computeStep)
{
	if (isNaN(computeStep) || computeStep < 1 || computeStep > 3) timerComputeStep = 1;
	if (timer < 0) { stopTimer(); }
	timer = setTimeout("recompute(" + computeStep + ");", 5000);
}

function stopTimer()
{
	if (timer) { clearTimer(timer); }
}


function recompute(step)
{
	switch(step) { 
		case 1: evalTotalPence();	// do not break
		case 2: evalBulbUsage();	// do not break
		case 3:	evalBulbCosts(); break;
		default: evalTotalPence(); evalBulbUsage(); evalBulbCosts();
	}
}

var totalPence = 0;
var costPerKWH = 0;
var kgCO2PerKWH = 0.537; // Defra - http://www.defra.gov.uk/environment/climatechange/uk/individual/actonco2/index.htm

var wattage = 0;
var numBulbs = 0;
var avgUsagePerMonth = 0;
var avgHoursPerDay = 0;
var annUsage = 0;
var grandTotal = 0; // total (starting) cost per year in pence
var estKWHPerMonth = 0;

var percentPeakUsage = 0.95;
var peakRate = 0.0;
var offPeakRate = 0.0;
var blendedRate = 0.0;

function evalTotalPence()
{
	// Standing charge

	var standingCharge = document.getElementById("ecStandingCharge").value;
	var standingChargeMultiplier = document.getElementById("ecStandingChargePeriod").value;
	var initialPeakRate = document.getElementById("ecInitialPeakRate").value;
	var initialAmt = document.getElementById("ecInitialAmt").value;
	peakRate = document.getElementById("ecPeakRate").value;
	offPeakRate = document.getElementById("ecOffPeakRate").value;
	var totalQtrUsage = document.getElementById("ecTotalQtrUsage").value;
	var pctOffPeak = document.getElementById("ecPctOffPeak").value / 100.0;
	var vatInclusive = document.getElementById("ecVatInclusive").value;
	
	annUsage = totalQtrUsage * 4;
	var annRemainingAmt = Math.max(0, annUsage-initialAmt);
	
	var annStandingCharge = standingCharge * standingChargeMultiplier * 100;
	var initialCharge = Math.min(initialAmt, annUsage) * initialPeakRate;
	var annPeakCharge = annRemainingAmt * (1.0 - pctOffPeak) * peakRate;
	var annOffPeakCharge = annRemainingAmt * pctOffPeak * offPeakRate;
	
	grandTotal = annStandingCharge + initialCharge + annPeakCharge + annOffPeakCharge;
	
	if (vatInclusive!=1) grandTotal = grandTotal * 1.05;
	
	totalPence = grandTotal;
	costPerKWH = totalPence / annUsage;
	
	document.getElementById("annualCostText").innerHTML = new Number(grandTotal/100).toFixed(2);
	document.getElementById("averageCostText").innerHTML = new Number(grandTotal / annUsage).toFixed(3);

	document.getElementById("totalCO2Output").innerHTML = new Number(annUsage * kgCO2PerKWH).toCurFormat(0);
	document.getElementById("kgCO2PerKWH").innerHTML = new Number(kgCO2PerKWH * 1000).toFixed(0);
}

function evalBulbUsage()
{
	wattage = new Number(document.getElementById("masterWattage").value);
	percentPeakUsage = new Number(document.getElementById("percentPeakUsage").value) / 100;
	
	// This is the blended rate for the lighting under consideration
	blendedRate = (peakRate-offPeakRate) * percentPeakUsage + (1.0 * offPeakRate);
	document.getElementById("blendedRate").innerHTML = new Number(blendedRate).toFixed(3);

	numBulbs =
		new Number(document.getElementById("buLivingNum").value) + 
		new Number(document.getElementById("buDiningNum").value) + 
		new Number(document.getElementById("buKitchenNum").value) + 
		new Number(document.getElementById("buBed1Num").value) + 
		new Number(document.getElementById("buBed2Num").value) + 
		new Number(document.getElementById("buBed3Num").value) + 
		new Number(document.getElementById("buBath1Num").value) + 
		new Number(document.getElementById("buBath2Num").value) + 
		new Number(document.getElementById("buOtherNum").value);

	var totalHoursPerDay = 0.0 + 
		document.getElementById("buLivingNum").value * document.getElementById("buLivingAmt").value + 
		document.getElementById("buDiningNum").value * document.getElementById("buDiningAmt").value + 
		document.getElementById("buKitchenNum").value * document.getElementById("buKitchenAmt").value + 
		document.getElementById("buBed1Num").value * document.getElementById("buBed1Amt").value + 
		document.getElementById("buBed2Num").value * document.getElementById("buBed2Amt").value + 
		document.getElementById("buBed3Num").value * document.getElementById("buBed3Amt").value + 
		document.getElementById("buBath1Num").value * document.getElementById("buBath1Amt").value + 
		document.getElementById("buBath2Num").value * document.getElementById("buBath2Amt").value + 
		document.getElementById("buOtherNum").value * document.getElementById("buOtherAmt").value;
	
	var totalWHPerDay = totalHoursPerDay * wattage;
	avgHoursPerDay = totalHoursPerDay / numBulbs;
	estKWHPerMonth = totalWHPerDay / 1000 * 365.25 / 12;
	var estEnergyCost = estKWHPerMonth * (blendedRate / 100);
	
	document.getElementById("buTotalBulbs").innerHTML = new Number(numBulbs).toFixed(0);
	document.getElementById("buSumBulbs").value = new Number(numBulbs).toFixed(0);
	document.getElementById("buSumHours").value = new Number(totalHoursPerDay).toFixed(1);
	
	document.getElementById("buAverageHours").innerHTML = new Number(totalHoursPerDay / numBulbs).toFixed(1);
	document.getElementById("buEstEnergyPerMonth").innerHTML = new Number(estKWHPerMonth).toFixed(3);
	document.getElementById("buEnergyFraction").innerHTML = new Number(estKWHPerMonth * 12 / annUsage * 100).toFixed(1);
	document.getElementById("buEstEnergyCost").innerHTML = new Number(estEnergyCost).toFixed(2);

	document.getElementById("buEstEmissions").innerHTML = new Number(estKWHPerMonth * kgCO2PerKWH).toFixed(1);		
}

function evalBulbCosts()
{
	document.getElementById("halWattage").value = new Number(wattage).toFixed(1);

	var replaceRegardless = new Number(document.getElementById("replaceRegardless").checked);

	var halCost = new Number(document.getElementById("halCost").value);
	var halLifespan = new Number(document.getElementById("halLifespan").value);

	var cflCost = new Number(document.getElementById("cflCost").value);
	var cflWattage = new Number(document.getElementById("cflWattage").value);
	var cflLifespan = new Number(document.getElementById("cflLifespan").value);

	var largerLifespan = Math.max(halLifespan, cflLifespan);

	var halCostPerMonth = wattage / 1000 * avgHoursPerDay * (365.25 / 12) * (blendedRate / 100);
	var halFirstYearCost = (halCost) + halCostPerMonth * 12;
	var halCostOverCFLLifetime = ((Math.ceil(largerLifespan/halLifespan)) * halCost) + 
		(largerLifespan * wattage / 1000 * (blendedRate / 100));

	var cflCostPerMonth = cflWattage / 1000 * avgHoursPerDay * (365.25 / 12) * (blendedRate / 100);
	var cflFirstYearCost = cflCost + cflCostPerMonth * 12;
	var cflCostOverCFLLifetime = (Math.ceil(largerLifespan/cflLifespan) * cflCost) + 
		(largerLifespan * cflWattage / 1000 * (blendedRate / 100));

	// Update the table
	document.getElementById("halCostPerMonth").value = new Number(halCostPerMonth).toFixed(2);
	document.getElementById("halFirstYearCost").value = new Number(halFirstYearCost).toFixed(2);
	document.getElementById("halCostOverCFLLifetime").value = new Number(halCostOverCFLLifetime).toFixed(2);

	document.getElementById("cflCostPerMonth").value = new Number(cflCostPerMonth).toFixed(2);
	document.getElementById("cflFirstYearCost").value = new Number(cflFirstYearCost).toFixed(2);
	document.getElementById("cflCostOverCFLLifetime").value = new Number(cflCostOverCFLLifetime).toFixed(2);

	document.getElementById("savCost").value = new Number(halCost * (1-replaceRegardless) - cflCost).toFixed(2);
	document.getElementById("savCostPerMonth").value = new Number(halCostPerMonth - cflCostPerMonth).toFixed(2);
	document.getElementById("savFirstYearCost").value = new Number(halFirstYearCost - cflFirstYearCost).toFixed(2);
	document.getElementById("savCostOverCFLLifetime").value = new Number(halCostOverCFLLifetime - cflCostOverCFLLifetime).toFixed(2);

	document.getElementById("totCost").value = new Number((halCost * (1-replaceRegardless) - cflCost) * numBulbs).toFixed(2);
	document.getElementById("totCostPerMonth").value = new Number((halCostPerMonth - cflCostPerMonth) * numBulbs).toFixed(2);

	document.getElementById("txtCostPerMonth").innerHTML = new Number((halCostPerMonth - cflCostPerMonth) * numBulbs).toFixed(2);
	document.getElementById("txtCostPerYear").innerHTML = new Number((halCostPerMonth - cflCostPerMonth) * numBulbs * 12).toFixed(2);

	document.getElementById("totFirstYearCost").value = new Number((halFirstYearCost - cflFirstYearCost) * numBulbs).toFixed(2);
	document.getElementById("totCostOverCFLLifetime").value = new Number( (halCostOverCFLLifetime - cflCostOverCFLLifetime) * numBulbs ).toCurFormat(2);

	document.getElementById("halCO2perYear").value = new Number(
		(wattage * avgHoursPerDay * 365.25 / 1000 * kgCO2PerKWH)
	).toFixed(1);
	
	document.getElementById("cflCO2perYear").value = new Number(
		(cflWattage * avgHoursPerDay * 365.25 / 1000 * kgCO2PerKWH)
	).toFixed(1);
	
	document.getElementById("savCO2perYear").value = new Number(
		((wattage - cflWattage) * avgHoursPerDay * 365.25 / 1000 * kgCO2PerKWH)
	).toFixed(1);
	
	document.getElementById("totCO2perYear").value = new Number(
		((wattage - cflWattage) * avgHoursPerDay * 365.25 / 1000 * kgCO2PerKWH * numBulbs)
	).toFixed(1);
	
	document.getElementById("energyReduction").innerHTML = new Number(
		((halCostPerMonth - cflCostPerMonth) * numBulbs * 12) / (grandTotal / 100) * 100
	).toFixed(1);

	document.getElementById("pctCarbonReduction").innerHTML = new Number(
		estKWHPerMonth * 12 * ((wattage - cflWattage) / wattage) / annUsage * 100
	).toCurFormat(0);
	
	document.getElementById("carbonReduction").innerHTML = new Number(
		estKWHPerMonth * 12 * ((wattage - cflWattage) / wattage) * kgCO2PerKWH
	).toCurFormat(0);

	// This is the number of months of energy savings required to recover the cost of the bulbs.
	var breakEvenMo = (
		(cflCost - halCost * (1-replaceRegardless)) / (halCostPerMonth - cflCostPerMonth)
	);
		
	var breakEvenDays = Math.ceil((breakEvenMo - Math.floor(breakEvenMo)) * 365.25 / 12);
	breakEvenMo = Math.floor(breakEvenMo);
	var breakEvenYrs = Math.floor(breakEvenMo / 12);
	breakEvenMo = breakEvenMo % 12;

	var monthUnitText = (breakEvenMo == 1) ? "month" : "months";		
	var yearUnitText = (breakEvenYrs == 1) ? "year" : "years";		
	var dayUnitText = (breakEvenDays == 1) ? "day" : "days";		

	if (breakEvenYrs == 0)
		document.getElementById("breakEvenStr").innerHTML = "" + breakEvenMo + " " + monthUnitText + " and " + breakEvenDays + " " + dayUnitText;
	else
		document.getElementById("breakEvenStr").innerHTML = "" + breakEvenYrs + " " + yearUnitText + ", " + breakEvenMo + " " + monthUnitText + " and " + breakEvenDays + " " + dayUnitText;

	var invest = (cflCost - halCost * (1-replaceRegardless)) * numBulbs;
	var totalROI = (halCostOverCFLLifetime - cflCostOverCFLLifetime) * numBulbs;
	var cflLifespanYears = cflLifespan / avgHoursPerDay / 365.25;

	document.getElementById("invest").innerHTML = new Number(invest).toFixed(2);
	document.getElementById("annualROI").innerHTML = new Number(totalROI / cflLifespanYears).toFixed(2);
	
	document.getElementById("cflLifespanYears").innerHTML = new Number(cflLifespanYears).toFixed(2);

	document.getElementById("totalROI").innerHTML = new Number( totalROI ).toCurFormat(2);
	
	document.getElementById("aer").innerHTML = new Number(
		((halCostPerMonth - cflCostPerMonth) * numBulbs * 12) / invest * 100
	).toFixed(1);

	// (Math.pow((totalROI / invest), 1/cflLifespanYears) - 1) * 100

}